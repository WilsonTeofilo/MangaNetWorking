-- A successful email OTP (or a verified Google email claim) establishes mailbox ownership.
-- Keep legacy accounts unverified until they complete one of those server-validated flows.
ALTER TABLE users
    ADD COLUMN email_verified_at TIMESTAMP WITHOUT TIME ZONE;
