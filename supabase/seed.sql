-- Seed Users & Profiles
INSERT INTO profiles (id, email, full_name, role, phone, location) VALUES
('11111111-1111-1111-1111-111111111111', 'farmer1@agribid.in', 'Karuppusamy M.', 'FARMER', '+91 98421 12345', 'Modakurichi, Erode'),
('11111111-1111-1111-1111-222222222222', 'farmer2@agribid.in', 'Palanisamy K.', 'FARMER', '+91 98422 23456', 'Sathyamangalam, Erode'),
('11111111-1111-1111-1111-333222111333', 'farmer3@agribid.in', 'Ramasamy N.', 'FARMER', '+91 98423 34567', 'Gobichettipalayam, Erode'),
('11111111-1111-1111-1111-444444444444', 'farmer4@agribid.in', 'Senthamizhan R.', 'FARMER', '+91 98424 45678', 'Perundurai, Erode'),
('11111111-1111-1111-1111-555555555555', 'farmer5@agribid.in', 'Dhanalakshmi V.', 'FARMER', '+91 98425 56789', 'Bhavani, Erode'),

('22222222-2222-2222-2222-111111111111', 'buyer1@agribid.in', 'Spice Exports India Ltd', 'BUYER', '+91 94431 11223', 'Chennai Port Hub'),
('22222222-2222-2222-2222-222222222222', 'buyer2@agribid.in', 'Erode Agro Traders', 'BUYER', '+91 94432 22334', 'Erode Town Market'),
('22222222-2222-2222-2222-333333333333', 'buyer3@agribid.in', 'South India Sugar Mills', 'BUYER', '+91 94433 33445', 'Appakudal, Erode'),
('22222222-2222-2222-2222-444444444444', 'buyer4@agribid.in', 'Kongu Oil Refineries', 'BUYER', '+91 94434 44556', 'Perundurai SIPCOT'),
('22222222-2222-2222-2222-555555555555', 'buyer5@agribid.in', 'Tamil Cotton Spinning Mills', 'BUYER', '+91 94435 55667', 'Tirupur Textile Hub'),

('33333333-3333-3333-3333-333333333333', 'admin@agribid.in', 'Erode Quality Inspector', 'ADMIN', '+91 90000 00000', 'Erode Agricultural Office')
ON CONFLICT (id) DO NOTHING;

-- Seed Warehouses
INSERT INTO warehouses (id, name, location, capacity, available_capacity, price_per_kg_per_day, temperature, humidity, supported_crops) VALUES
('a1111111-1111-1111-1111-111111111111', 'Erode Central Cold Storage & Hub', 'Erode Industrial Estate, Erode', 50000.0, 32000.0, 1.20, 18.5, 55.0, ARRAY['Turmeric', 'Banana', 'Groundnut']),
('a2222222-2222-2222-2222-222222222222', 'Gobichettipalayam Agri Depot', 'Main Road, Gobichettipalayam', 30000.0, 18500.0, 1.00, 22.0, 60.0, ARRAY['Sugarcane', 'Turmeric', 'Cotton']),
('a3333333-3333-3333-3333-333333333333', 'Perundurai Logistics Grain Yard', 'SIPCOT Complex, Perundurai', 40000.0, 25000.0, 1.15, 20.0, 58.0, ARRAY['Groundnut', 'Cotton', 'Turmeric'])
ON CONFLICT (id) DO NOTHING;

-- Seed Crops
INSERT INTO crops (id, name, variety, description, standard_grade) VALUES
('c1111111-1111-1111-1111-111111111111', 'Turmeric', 'Erode Finger (Viral Manjal)', 'High curcumin yellow turmeric from GI-tagged Erode region', 'Grade A'),
('c2222222-2222-2222-2222-222222222222', 'Banana', 'Grand Naine (Sevazhai/Poovan)', 'Fresh premium bunch harvested under optimal conditions', 'Grade A'),
('c3333333-3333-3333-3333-333333333333', 'Sugarcane', 'Co 0238 / Commercial', 'High brix sucrose sugarcane harvested fresh', 'Premium'),
('c4444444-4444-4444-4444-444444444444', 'Groundnut', 'TMV-7 Oilseed', 'Clean shelled groundnut pod with high oil content', 'Grade A'),
('c5555555-5555-5555-5555-555555555555', 'Cotton', 'MCU-5 Long Staple', 'White long staple fiber ideal for high-count yarn spinning', 'Grade A')
ON CONFLICT (id) DO NOTHING;

-- Seed Price History (Last 30 days for Turmeric, Banana, Sugarcane, Groundnut, Cotton)
INSERT INTO price_history (crop_name, date, price_per_kg, market_location) VALUES
('Turmeric', '2026-09-01', 138.00, 'Erode Market'),
('Turmeric', '2026-09-05', 140.50, 'Erode Market'),
('Turmeric', '2026-09-10', 142.00, 'Erode Market'),
('Turmeric', '2026-09-15', 143.50, 'Erode Market'),
('Turmeric', '2026-09-20', 144.00, 'Erode Market'),
('Turmeric', '2026-09-25', 145.00, 'Erode Market'),
('Turmeric', '2026-09-30', 146.50, 'Erode Market'),

('Banana', '2026-09-01', 22.00, 'Sathyamangalam Market'),
('Banana', '2026-09-10', 24.50, 'Sathyamangalam Market'),
('Banana', '2026-09-20', 25.00, 'Sathyamangalam Market'),
('Banana', '2026-09-30', 26.20, 'Sathyamangalam Market'),

('Sugarcane', '2026-09-01', 3.80, 'Gobi Sugar Mandi'),
('Sugarcane', '2026-09-15', 4.10, 'Gobi Sugar Mandi'),
('Sugarcane', '2026-09-30', 4.25, 'Gobi Sugar Mandi'),

('Groundnut', '2026-09-01', 72.00, 'Perundurai Yard'),
('Groundnut', '2026-09-15', 75.50, 'Perundurai Yard'),
('Groundnut', '2026-09-30', 78.00, 'Perundurai Yard'),

('Cotton', '2026-09-01', 65.00, 'Bhavani Market'),
('Cotton', '2026-09-15', 67.20, 'Bhavani Market'),
('Cotton', '2026-09-30', 69.50, 'Bhavani Market');

-- Seed Price Forecasts
INSERT INTO price_forecasts (crop_name, forecast_date, predicted_price, lower_bound, upper_bound, confidence) VALUES
('Turmeric', '2026-10-10', 158.00, 152.00, 164.00, 0.88),
('Banana', '2026-10-10', 27.50, 25.00, 29.00, 0.82),
('Sugarcane', '2026-10-10', 4.40, 4.10, 4.60, 0.90),
('Groundnut', '2026-10-10', 84.00, 80.00, 88.00, 0.85),
('Cotton', '2026-10-10', 72.00, 68.00, 75.00, 0.84);

-- Seed Crop Lots
INSERT INTO lots (id, lot_number, farmer_id, crop_id, crop_name, variety, quantity_kg, harvest_date, quality_grade, quality_score, warehouse_id, current_price, status) VALUES
('b1111111-1111-1111-1111-111111111111', 'ERD-TUR-2026-0001', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Turmeric', 'Erode Finger', 2000.0, '2026-09-25', 'Grade A', 94.50, 'a1111111-1111-1111-1111-111111111111', 145.00, 'STORED'),
('b2222222-2222-2222-2222-222222222222', 'ERD-TUR-2026-0002', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Turmeric', 'Erode Bulb', 3500.0, '2026-09-28', 'Grade A', 91.00, 'a1111111-1111-1111-1111-111111111111', 142.00, 'AUCTION'),
('b3333333-3333-3333-3333-333333333333', 'ERD-BAN-2026-0003', '11111111-1111-1111-1111-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Banana', 'Grand Naine', 5000.0, '2026-09-29', 'Grade B', 82.00, NULL, 26.00, 'HARVESTED'),
('b4444444-4444-4444-4444-444444444444', 'ERD-SUG-2026-0004', '11111111-1111-1111-1111-333222111333', 'c3333333-3333-3333-3333-333333333333', 'Sugarcane', 'Co 0238', 12000.0, '2026-09-20', 'Premium', 96.00, 'a2222222-2222-2222-2222-222222222222', 4.20, 'STORED'),
('b5555555-5555-5555-5555-555555555555', 'ERD-GND-2026-0005', '11111111-1111-1111-1111-444444444444', 'c4444444-4444-4444-4444-444444444444', 'Groundnut', 'TMV-7', 4000.0, '2026-09-27', 'Grade A', 89.50, 'a3333333-3333-3333-3333-333333333333', 78.00, 'AUCTION'),
('b6666666-6666-6666-6666-666666666666', 'ERD-COT-2026-0006', '11111111-1111-1111-1111-555555555555', 'c5555555-5555-5555-5555-555555555555', 'Cotton', 'MCU-5', 2500.0, '2026-09-22', 'Grade A', 93.00, 'a2222222-2222-2222-2222-222222222222', 69.50, 'SOLD')
ON CONFLICT (id) DO NOTHING;

-- Seed Lot Events
INSERT INTO lot_events (lot_id, stage, title, description, updated_by) VALUES
('b1111111-1111-1111-1111-111111111111', 'HARVESTED', 'Produce Harvested', 'Harvested 2,000 kg of Erode Finger Turmeric at Modakurichi farm', '11111111-1111-1111-1111-111111111111'),
('b1111111-1111-1111-1111-111111111111', 'QUALITY_VERIFIED', 'Quality Verification Passed', 'Inspected by Erode Quality Inspector. Grade A (94.5/100, Curcumin 4.8%)', '33333333-3333-3333-3333-333333333333'),
('b1111111-1111-1111-1111-111111111111', 'STORED', 'Stored in Warehouse', 'Reserved 2,000 kg capacity at Erode Central Cold Storage', '11111111-1111-1111-1111-111111111111'),

('b2222222-2222-2222-2222-222222222222', 'HARVESTED', 'Produce Harvested', 'Harvested 3,500 kg of Erode Bulb Turmeric', '11111111-1111-1111-1111-111111111111'),
('b2222222-2222-2222-2222-222222222222', 'QUALITY_VERIFIED', 'Quality Inspection Complete', 'Grade A score 91.0/100', '33333333-3333-3333-3333-333333333333'),
('b2222222-2222-2222-2222-222222222222', 'AUCTION', 'Auction Created', 'Auction opened at starting price ₹140.00/kg', '11111111-1111-1111-1111-111111111111');

-- Seed Quality Certificates
INSERT INTO quality_certificates (id, lot_id, certificate_no, moisture, purity, foreign_matter, weight, grade, quality_score, inspector_name, qr_code_url) VALUES
('c1111111-1111-1111-1111-999999999999', 'b1111111-1111-1111-1111-111111111111', 'CERT-2026-ERD-0001', 8.50, 98.20, 0.40, 2000.0, 'Grade A', 94.50, 'Dr. K. Arumugam, Senior Inspector', '/verify/b1111111-1111-1111-1111-111111111111'),
('c2222222-2222-2222-2222-999999999999', 'b2222222-2222-2222-2222-222222222222', 'CERT-2026-ERD-0002', 9.10, 97.50, 0.80, 3500.0, 'Grade A', 91.00, 'Dr. K. Arumugam, Senior Inspector', '/verify/b2222222-2222-2222-2222-222222222222'),
('c5555555-5555-5555-5555-999999999999', 'b5555555-5555-5555-5555-555555555555', 'CERT-2026-ERD-0005', 7.20, 96.80, 1.10, 4000.0, 'Grade A', 89.50, 'V. Sundaram, Quality Officer', '/verify/b5555555-5555-5555-5555-555555555555');

-- Seed Auctions
INSERT INTO auctions (id, lot_id, farmer_id, starting_price, reserve_price, start_time, end_time, current_bid, highest_bidder_id, highest_bidder_name, status) VALUES
('d2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 140.00, 148.00, NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '2 hours', 152.00, '22222222-2222-2222-2222-111111111111', 'Spice Exports India Ltd', 'LIVE'),
('d5555555-5555-5555-5555-555555555555', 'b5555555-5555-5555-5555-444444444444', '11111111-1111-1111-1111-444444444444', 75.00, 80.00, NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '1 hour', 82.50, '22222222-2222-2222-2222-444444444444', 'Kongu Oil Refineries', 'LIVE'),
('d6666666-6666-6666-6666-666666666666', 'b6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-555555555555', 68.00, 71.00, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '10 minutes', 73.00, '22222222-2222-2222-2222-555555555555', 'Tamil Cotton Spinning Mills', 'SOLD');

-- Seed Bids
INSERT INTO bids (auction_id, buyer_id, buyer_name, amount, is_winning, created_at) VALUES
('d2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Erode Agro Traders', 142.00, FALSE, NOW() - INTERVAL '25 minutes'),
('d2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-111111111111', 'Spice Exports India Ltd', 146.00, FALSE, NOW() - INTERVAL '18 minutes'),
('d2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Erode Agro Traders', 149.00, FALSE, NOW() - INTERVAL '10 minutes'),
('d2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-111111111111', 'Spice Exports India Ltd', 152.00, TRUE, NOW() - INTERVAL '2 minutes'),

('d5555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-444444444444', 'Kongu Oil Refineries', 78.00, FALSE, NOW() - INTERVAL '12 minutes'),
('d5555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-444444444444', 'Kongu Oil Refineries', 82.50, TRUE, NOW() - INTERVAL '5 minutes');

-- Seed Payment & Shipment for SOLD Cotton Lot
INSERT INTO payments (id, auction_id, lot_id, buyer_id, farmer_id, amount, status, simulated_gateway_ref) VALUES
('p6666666-6666-6666-6666-666666666666', 'd6666666-6666-6666-6666-666666666666', 'b6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-555555555555', '11111111-1111-1111-1111-555555555555', 182500.00, 'PAID', 'SIM-PAY-2026-88712');

INSERT INTO shipments (id, payment_id, lot_id, buyer_id, farmer_id, origin, destination, tracking_number, status, current_location, estimated_delivery) VALUES
('s6666666-6666-6666-6666-666666666666', 'p6666666-6666-6666-6666-666666666666', 'b6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-555555555555', '11111111-1111-1111-1111-555555555555', 'Gobichettipalayam Agri Depot', 'Tirupur Textile Hub', 'TRK-ERD-9921', 'IN_TRANSIT', 'Avinashi Highway Toll Plaza', NOW() + INTERVAL '1 day');
