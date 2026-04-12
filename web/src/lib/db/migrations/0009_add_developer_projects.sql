-- Developer Projects table for showcasing new construction projects
CREATE TABLE IF NOT EXISTS developer_projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_name varchar(200) NOT NULL,
  project_name  varchar(200) NOT NULL,
  slug          varchar(200) NOT NULL UNIQUE,
  description   text,
  project_type  varchar(50),
  project_status varchar(50) DEFAULT 'selling',
  city          varchar(100),
  neighborhood  varchar(200),
  address       text,
  latitude      real,
  longitude     real,
  price_from_eur integer,
  price_to_eur  integer,
  units_total   integer,
  units_available integer,
  completion_date timestamptz,
  amenities     jsonb,
  images        jsonb DEFAULT '[]'::jsonb,
  brochure_url  text,
  contact_phone varchar(50),
  contact_email varchar(255),
  contact_whatsapp varchar(50),
  website       text,
  campaign_id   uuid,
  is_featured   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_city ON developer_projects (city);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON developer_projects (is_featured);
