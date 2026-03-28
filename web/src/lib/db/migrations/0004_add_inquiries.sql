-- Inquiries: contact messages from users to listing posters
CREATE TABLE IF NOT EXISTS inquiries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    sender_name varchar(255) NOT NULL,
    sender_email varchar(255) NOT NULL,
    sender_phone varchar(50),
    message text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_listing
    ON inquiries(listing_id, created_at DESC);
