from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

def calculate_addon_price(
    tier: str, 
    addon_type: str, 
    sub_type: Optional[str] = None, 
    quantity: int = 1, 
    remaining_days: int = 30
) -> Decimal:
    """
    Calculate price for add-ons based on business rules.
    """
    # Rule A: Basic Tier Promo (Cross Posting)
    if tier.lower() == 'basic' and addon_type == 'cross_posting':
        return Decimal('100000.00')

    # Rule B: Pro Tier Proration (Cross Posting)
    if tier.lower() == 'pro' and addon_type == 'cross_posting':
        base_price = Decimal('200000.00')
        if remaining_days >= 30:
            return base_price
        # Proration formula: (200,000 / 30) * remaining_days
        prorated = (base_price / Decimal('30')) * Decimal(remaining_days)
        return prorated.quantize(Decimal('1.00'))

    # Proxy Services Logic
    if addon_type == 'proxy':
        unit_prices = {
            'shared': Decimal('10000.00'),    # 150k / 15
            'private': Decimal('22500.00'),   # 450k / 20 -> Wait, user said 450k/20 is 22.5k unit
            'dedicated': Decimal('44000.00')  # 1.1jt / 25 is 44k unit
        }
        # Correcting based on user prompt values if they differ
        # Shared: 15 IPs = 150k (7,500/IP) -> User said 7,500
        # Private: 20 IPs = 450k (18,000/IP)? -> User said 18,000
        # Dedicated: 25 IPs = 1.1jt (37,000/IP)? -> User said 37,000
        # I will follow user's specific unit costs from Rule 2A
        unit_costs = {
            'shared': Decimal('7500.00'),
            'private': Decimal('18000.00'),
            'dedicated': Decimal('37000.00')
        }
        
        cost = unit_costs.get(sub_type, Decimal('0')) * Decimal(quantity)
        return cost

    return Decimal('0.00')

def calculate_upgrade_cost(
    current_plan_price: Decimal,
    current_plan_duration: int,
    remaining_days: int,
    new_plan_price: Decimal
) -> Decimal:
    """
    Rule 4: Upgrade Logic (Prorated Discount System)
    """
    if current_plan_duration <= 0:
        return new_plan_price

    daily_value = current_plan_price / Decimal(current_plan_duration)
    remaining_credit = daily_value * Decimal(remaining_days)
    
    upgrade_cost = new_plan_price - remaining_credit
    
    return max(Decimal('0.00'), upgrade_cost).quantize(Decimal('1.00'))
