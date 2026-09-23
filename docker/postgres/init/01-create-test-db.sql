-- Separate database for the integration test suite so tests never touch dev data.
CREATE DATABASE leads_test OWNER leads;
