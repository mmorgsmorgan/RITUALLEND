// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {InterestRateModel} from "./InterestRateModel.sol";
import {CreditScore} from "./CreditScore.sol";
import {Errors} from "./lib/Errors.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RitualLend
/// @notice Single-asset (native RITUAL) money market with credit-tiered LTV.
/// Internal rRITUAL receipt token doubles as collateral; transfers are blocked
/// when they would leave the sender unhealthy.
contract RitualLend is ReentrancyGuard {
    uint256 public constant WAD = 1e18;
    uint256 public constant LIQUIDATION_BONUS = 0.05e18; // 5%
    uint256 public constant CLOSE_FACTOR = 0.50e18;      // up to 50% per liquidate

    string public constant name = "Ritual Lend Receipt";
    string public constant symbol = "rRITUAL";
    uint8 public constant decimals = 18;

    address public immutable owner;
    InterestRateModel public immutable rateModel;
    CreditScore public immutable credit;

    // -- ERC20 storage for rRITUAL --
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // -- Market accounting --
    uint256 public totalCash;          // RITUAL held by this contract that is unborrowed
    uint256 public totalBorrows;       // outstanding principal + accrued interest (current units)
    uint256 public borrowIndex;        // grows over time; 1e18 = no accrual
    uint256 public supplyIndex;        // grows over time; 1e18 = no yield
    uint256 public lastAccrualMs;      // block.timestamp in ms

    struct BorrowSnapshot {
        uint256 principal;   // debt in current units at last interaction
        uint256 indexAtBorrow; // borrowIndex value at last interaction
    }
    mapping(address => BorrowSnapshot) public borrows;

    // -- Events --
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    event Deposit(address indexed user, uint256 ritualIn, uint256 sharesOut);
    event Withdraw(address indexed user, uint256 sharesIn, uint256 ritualOut);
    event Borrow(address indexed user, uint256 amount, uint256 newDebt);
    event Repay(address indexed user, uint256 amount, uint256 remainingDebt, bool onTime);
    event Liquidate(address indexed liquidator, address indexed borrower, uint256 repaid, uint256 seizedShares);
    event Accrued(uint256 borrowIndex, uint256 supplyIndex, uint256 newBorrows);

    modifier accrue() {
        _accrue();
        _;
    }

    constructor(address _rateModel, address _credit) {
        owner = msg.sender;
        rateModel = InterestRateModel(_rateModel);
        credit = CreditScore(_credit);
        borrowIndex = WAD;
        supplyIndex = WAD;
        lastAccrualMs = block.timestamp;
    }

    receive() external payable {
        // direct sends count as cash donations; do not mint shares
        totalCash += msg.value;
    }

    // ============== Lender side ==============

    /// @notice Deposit native RITUAL, receive rRITUAL.
    function deposit() external payable nonReentrant accrue returns (uint256 shares) {
        if (msg.value == 0) revert Errors.ZeroAmount();
        uint256 supply = totalSupply;
        if (supply == 0 || (totalCash + totalBorrows) == 0) {
            shares = msg.value;
        } else {
            shares = (msg.value * supply) / (totalCash + totalBorrows);
        }
        totalCash += msg.value;
        _mint(msg.sender, shares);
        emit Deposit(msg.sender, msg.value, shares);
    }

    /// @notice Burn rRITUAL, withdraw native RITUAL.
    function withdraw(uint256 shares) external nonReentrant accrue returns (uint256 ritualOut) {
        if (shares == 0) revert Errors.ZeroAmount();
        if (balanceOf[msg.sender] < shares) revert Errors.InsufficientShares();
        uint256 supply = totalSupply;
        ritualOut = (shares * (totalCash + totalBorrows)) / supply;
        if (ritualOut > totalCash) revert Errors.InsufficientCash();
        _burn(msg.sender, shares);
        // health: account must remain healthy after losing collateral
        _requireHealthy(msg.sender);
        totalCash -= ritualOut;
        _sendRitual(msg.sender, ritualOut);
        emit Withdraw(msg.sender, shares, ritualOut);
    }

    // ============== Borrower side ==============

    /// @notice Borrow native RITUAL against rRITUAL collateral.
    function borrow(uint256 amount) external nonReentrant accrue {
        if (amount == 0) revert Errors.ZeroAmount();
        if (amount > totalCash) revert Errors.InsufficientCash();

        _settleDebt(msg.sender);
        BorrowSnapshot storage b = borrows[msg.sender];
        b.principal += amount;
        b.indexAtBorrow = borrowIndex;
        totalBorrows += amount;
        totalCash -= amount;

        credit.onBorrow(msg.sender);
        _requireHealthy(msg.sender);
        _sendRitual(msg.sender, amount);
        emit Borrow(msg.sender, amount, b.principal);
    }

    /// @notice Repay native RITUAL. Excess is refunded.
    function repay() external payable nonReentrant accrue {
        if (msg.value == 0) revert Errors.ZeroAmount();
        _settleDebt(msg.sender);
        BorrowSnapshot storage b = borrows[msg.sender];
        uint256 debt = b.principal;
        uint256 pay = msg.value > debt ? debt : msg.value;
        bool onTime = true; // single-asset, never-overdue: every voluntary repay counts
        b.principal = debt - pay;
        b.indexAtBorrow = borrowIndex;
        totalBorrows -= pay;
        totalCash += pay;

        credit.onRepay(msg.sender, onTime);
        if (b.principal == 0) credit.onFullyRepaid(msg.sender);

        if (msg.value > pay) _sendRitual(msg.sender, msg.value - pay);
        emit Repay(msg.sender, pay, b.principal, onTime);
    }

    /// @notice Liquidate an unhealthy borrower. Liquidator pays RITUAL, seizes rRITUAL.
    function liquidate(address borrower, uint256 repayAmount) external payable nonReentrant accrue {
        if (msg.value == 0 || repayAmount == 0) revert Errors.ZeroAmount();
        if (msg.value < repayAmount) revert Errors.ZeroAmount();
        if (_isHealthy(borrower)) revert Errors.AlreadyHealthy();

        _settleDebt(borrower);
        BorrowSnapshot storage b = borrows[borrower];
        uint256 debt = b.principal;
        uint256 maxRepay = (debt * CLOSE_FACTOR) / WAD;
        uint256 pay = repayAmount > maxRepay ? maxRepay : repayAmount;
        if (pay > debt) pay = debt;

        b.principal = debt - pay;
        b.indexAtBorrow = borrowIndex;
        totalBorrows -= pay;
        totalCash += pay;

        // seize rRITUAL worth pay * (1 + bonus) in underlying terms
        uint256 seizeUnderlying = (pay * (WAD + LIQUIDATION_BONUS)) / WAD;
        uint256 seizeShares = _underlyingToShares(seizeUnderlying);
        uint256 bal = balanceOf[borrower];
        if (seizeShares > bal) seizeShares = bal;
        _transferShares(borrower, msg.sender, seizeShares);

        credit.onLoanDefaulted(borrower);
        if (b.principal == 0) credit.onFullyRepaid(borrower);

        if (msg.value > pay) _sendRitual(msg.sender, msg.value - pay);
        emit Liquidate(msg.sender, borrower, pay, seizeShares);
    }

    // ============== ERC20 (rRITUAL) ==============

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transferShares(msg.sender, to, value);
        _requireHealthy(msg.sender);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) allowance[from][msg.sender] = a - value;
        _transferShares(from, to, value);
        _requireHealthy(from);
        return true;
    }

    // ============== Views ==============

    function borrowBalance(address user) public view returns (uint256) {
        BorrowSnapshot memory b = borrows[user];
        if (b.principal == 0) return 0;
        return (b.principal * _projectedBorrowIndex()) / b.indexAtBorrow;
    }

    function collateralUnderlying(address user) public view returns (uint256) {
        uint256 supply = totalSupply;
        if (supply == 0) return 0;
        return (balanceOf[user] * (totalCash + _projectedTotalBorrows())) / supply;
    }

    /// @return health factor in 1e18. >=1e18 = healthy.
    function healthFactor(address user) public view returns (uint256) {
        uint256 debt = borrowBalance(user);
        if (debt == 0) return type(uint256).max;
        (, uint256 maxLtv,) = credit.tier(user);
        uint256 collat = collateralUnderlying(user);
        uint256 borrowCapacity = (collat * maxLtv) / WAD;
        return (borrowCapacity * WAD) / debt;
    }

    function utilization() external view returns (uint256) {
        return rateModel.utilization(totalCash, totalBorrows);
    }

    function getBorrowRatePerMs(address user) public view returns (uint256) {
        uint256 base = rateModel.getBorrowRatePerMs(totalCash, totalBorrows);
        (,, uint256 mul) = credit.tier(user);
        return (base * mul) / WAD;
    }

    function getSupplyRatePerMs() external view returns (uint256) {
        return rateModel.getSupplyRatePerMs(totalCash, totalBorrows, 0);
    }

    // ============== Internals ==============

    function _accrue() internal {
        uint256 nowMs = block.timestamp;
        uint256 dt = nowMs - lastAccrualMs;
        if (dt == 0) return;
        if (totalBorrows == 0) {
            lastAccrualMs = nowMs;
            return;
        }
        uint256 borrowRate = rateModel.getBorrowRatePerMs(totalCash, totalBorrows);
        uint256 supplyRate = rateModel.getSupplyRatePerMs(totalCash, totalBorrows, 0);
        uint256 borrowGrowth = (borrowRate * dt);
        uint256 supplyGrowth = (supplyRate * dt);
        // borrowIndex *= (1 + borrowRate * dt)
        borrowIndex = borrowIndex + (borrowIndex * borrowGrowth) / WAD;
        supplyIndex = supplyIndex + (supplyIndex * supplyGrowth) / WAD;
        uint256 interest = (totalBorrows * borrowGrowth) / WAD;
        totalBorrows += interest;
        lastAccrualMs = nowMs;
        emit Accrued(borrowIndex, supplyIndex, totalBorrows);
    }

    function _projectedBorrowIndex() internal view returns (uint256) {
        uint256 dt = block.timestamp - lastAccrualMs;
        if (dt == 0 || totalBorrows == 0) return borrowIndex;
        uint256 borrowRate = rateModel.getBorrowRatePerMs(totalCash, totalBorrows);
        return borrowIndex + (borrowIndex * borrowRate * dt) / WAD;
    }

    function _projectedTotalBorrows() internal view returns (uint256) {
        uint256 dt = block.timestamp - lastAccrualMs;
        if (dt == 0 || totalBorrows == 0) return totalBorrows;
        uint256 borrowRate = rateModel.getBorrowRatePerMs(totalCash, totalBorrows);
        return totalBorrows + (totalBorrows * borrowRate * dt) / WAD;
    }

    function _settleDebt(address user) internal {
        BorrowSnapshot storage b = borrows[user];
        if (b.principal == 0) {
            b.indexAtBorrow = borrowIndex;
            return;
        }
        uint256 next = (b.principal * borrowIndex) / b.indexAtBorrow;
        uint256 added = next - b.principal;
        b.principal = next;
        b.indexAtBorrow = borrowIndex;
        if (added > 0) {
            // accrue() already credited totalBorrows globally; do not double count.
        }
    }

    function _isHealthy(address user) internal view returns (bool) {
        return healthFactor(user) >= WAD;
    }

    function _requireHealthy(address user) internal view {
        if (!_isHealthy(user)) revert Errors.Unhealthy();
    }

    function _underlyingToShares(uint256 underlying) internal view returns (uint256) {
        uint256 supply = totalSupply;
        uint256 totalUnderlying = totalCash + totalBorrows;
        if (supply == 0 || totalUnderlying == 0) return underlying;
        return (underlying * supply) / totalUnderlying;
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function _transferShares(address from, address to, uint256 amount) internal {
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _sendRitual(address to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert Errors.TransferFailed();
    }
}
