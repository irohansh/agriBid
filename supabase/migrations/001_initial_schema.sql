-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('FARMER', 'BUYER', 'ADMIN')),
    phone TEXT,
    location TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    capacity NUMERIC(12, 2) NOT NULL CHECK (capacity > 0),
    available_capacity NUMERIC(12, 2) NOT NULL CHECK (available_capacity >= 0),
    price_per_kg_per_day NUMERIC(10, 2) NOT NULL CHECK (price_per_kg_per_day >= 0),
    temperature NUMERIC(5, 2) DEFAULT 24.0,
    humidity NUMERIC(5, 2) DEFAULT 60.0,
    supported_crops TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Warehouse Reservations
CREATE TABLE IF NOT EXISTS warehouse_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    lot_id UUID NOT NULL,
    farmer_id UUID NOT NULL REFERENCES profiles(id),
    reserved_capacity NUMERIC(12, 2) NOT NULL CHECK (reserved_capacity > 0),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE,
    total_cost NUMERIC(12, 2) DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RELEASED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Crops
CREATE TABLE IF NOT EXISTS crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    variety TEXT NOT NULL,
    description TEXT,
    standard_grade TEXT DEFAULT 'Grade A',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Lots
CREATE TABLE IF NOT EXISTS lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_number TEXT UNIQUE NOT NULL,
    farmer_id UUID NOT NULL REFERENCES profiles(id),
    crop_id UUID REFERENCES crops(id),
    crop_name TEXT NOT NULL,
    variety TEXT NOT NULL,
    quantity_kg NUMERIC(12, 2) NOT NULL CHECK (quantity_kg > 0),
    harvest_date DATE NOT NULL,
    quality_grade TEXT DEFAULT 'PENDING',
    quality_score NUMERIC(5, 2) DEFAULT 0.0,
    warehouse_id UUID REFERENCES warehouses(id),
    current_price NUMERIC(10, 2) DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'HARVESTED' CHECK (status IN ('HARVESTED', 'QUALITY_VERIFIED', 'STORED', 'AUCTION', 'SOLD', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Quality Certificates
CREATE TABLE IF NOT EXISTS quality_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID UNIQUE NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    certificate_no TEXT UNIQUE NOT NULL,
    moisture NUMERIC(5, 2) NOT NULL,
    purity NUMERIC(5, 2) NOT NULL,
    foreign_matter NUMERIC(5, 2) NOT NULL,
    weight NUMERIC(12, 2) NOT NULL,
    grade TEXT NOT NULL,
    quality_score NUMERIC(5, 2) NOT NULL,
    inspector_name TEXT NOT NULL,
    qr_code_url TEXT,
    document_url TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Lot Events (Lifecycle tracking)
CREATE TABLE IF NOT EXISTS lot_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('HARVESTED', 'QUALITY_VERIFIED', 'STORED', 'AUCTION', 'SOLD', 'PAYMENT', 'DELIVERED', 'COMPLETED')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Price History
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_name TEXT NOT NULL,
    date DATE NOT NULL,
    price_per_kg NUMERIC(10, 2) NOT NULL,
    market_location TEXT NOT NULL DEFAULT 'Erode Market',
    volume_kg NUMERIC(12, 2) DEFAULT 50000.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Price Forecasts
CREATE TABLE IF NOT EXISTS price_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_name TEXT NOT NULL,
    forecast_date DATE NOT NULL,
    predicted_price NUMERIC(10, 2) NOT NULL,
    lower_bound NUMERIC(10, 2),
    upper_bound NUMERIC(10, 2),
    confidence NUMERIC(5, 2) DEFAULT 0.85,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Auctions
CREATE TABLE IF NOT EXISTS auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID UNIQUE NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES profiles(id),
    starting_price NUMERIC(10, 2) NOT NULL,
    reserve_price NUMERIC(10, 2) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    current_bid NUMERIC(10, 2) DEFAULT 0.0,
    highest_bidder_id UUID REFERENCES profiles(id),
    highest_bidder_name TEXT,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'LIVE', 'ENDED', 'SOLD', 'UNSOLD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bids
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES profiles(id),
    buyer_name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    is_winning BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID UNIQUE NOT NULL REFERENCES auctions(id),
    lot_id UUID NOT NULL REFERENCES lots(id),
    buyer_id UUID NOT NULL REFERENCES profiles(id),
    farmer_id UUID NOT NULL REFERENCES profiles(id),
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'SETTLED')),
    simulated_gateway_ref TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Shipments
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID UNIQUE NOT NULL REFERENCES payments(id),
    lot_id UUID NOT NULL REFERENCES lots(id),
    buyer_id UUID NOT NULL REFERENCES profiles(id),
    farmer_id UUID NOT NULL REFERENCES profiles(id),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    tracking_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED')),
    current_location TEXT,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type TEXT DEFAULT 'INFO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lots_farmer_id ON lots(farmer_id);
CREATE INDEX IF NOT EXISTS idx_lots_status ON lots(status);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_price_history_crop_date ON price_history(crop_name, date);

-- Atomic Warehouse Reservation Function (Enforces Overbooking Prevention)
CREATE OR REPLACE FUNCTION reserve_warehouse_capacity(
    p_warehouse_id UUID,
    p_lot_id UUID,
    p_farmer_id UUID,
    p_requested_capacity NUMERIC
) RETURNS JSON AS $$
DECLARE
    v_available NUMERIC;
    v_name TEXT;
    v_cost NUMERIC;
    v_price_per_kg NUMERIC;
    v_res_id UUID;
BEGIN
    -- Lock warehouse row for update
    SELECT available_capacity, name, price_per_kg_per_day 
    INTO v_available, v_name, v_price_per_kg
    FROM warehouses 
    WHERE id = p_warehouse_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Warehouse not found';
    END IF;

    IF v_available < p_requested_capacity THEN
        RAISE EXCEPTION 'Overbooking Error: Requested % kg exceeds available capacity % kg at %', 
            p_requested_capacity, v_available, v_name;
    END IF;

    -- Update warehouse available capacity
    UPDATE warehouses 
    SET available_capacity = available_capacity - p_requested_capacity 
    WHERE id = p_warehouse_id;

    v_cost := p_requested_capacity * v_price_per_kg * 7.0; -- Default 7 days estimation

    -- Create reservation record
    INSERT INTO warehouse_reservations (warehouse_id, lot_id, farmer_id, reserved_capacity, total_cost)
    VALUES (p_warehouse_id, p_lot_id, p_farmer_id, p_requested_capacity, v_cost)
    RETURNING id INTO v_res_id;

    -- Update lot with warehouse assignment and status
    UPDATE lots 
    SET warehouse_id = p_warehouse_id, status = 'STORED', updated_at = CURRENT_TIMESTAMP
    WHERE id = p_lot_id;

    -- Log lot event
    INSERT INTO lot_events (lot_id, stage, title, description, updated_by)
    VALUES (p_lot_id, 'STORED', 'Stored in Warehouse', 'Reserved ' || p_requested_capacity || ' kg capacity at ' || v_name, p_farmer_id);

    RETURN json_build_object(
        'success', true,
        'reservation_id', v_res_id,
        'reserved_capacity', p_requested_capacity,
        'warehouse_name', v_name,
        'remaining_capacity', v_available - p_requested_capacity
    );
END;
$$ LANGUAGE plpgsql;
