/*
  # Land Ownership Management System

  1. New Tables
    - `people`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
    - `land_plots`
      - `id` (uuid, primary key)
      - `person_id` (uuid, foreign key to people)
      - `x` (integer, x coordinate)
      - `y` (integer, y coordinate)
      - `width` (integer, plot width)
      - `height` (integer, plot height)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access (since this is a village system)
    - Add policies for authenticated users to manage data

  3. Sample Data
    - Insert sample people and their land plots for demonstration
*/

-- Create people table
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create land_plots table
CREATE TABLE IF NOT EXISTS land_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES people(id) ON DELETE CASCADE,
  x integer NOT NULL CHECK (x >= 0),
  y integer NOT NULL CHECK (y >= 0),
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_plots ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (village system)
CREATE POLICY "Anyone can view people"
  ON people
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can view land plots"
  ON land_plots
  FOR SELECT
  TO public
  USING (true);

-- Create policies for authenticated users to manage data
CREATE POLICY "Authenticated users can insert people"
  ON people
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update people"
  ON people
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete people"
  ON people
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert land plots"
  ON land_plots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update land plots"
  ON land_plots
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete land plots"
  ON land_plots
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert sample data for demonstration
INSERT INTO people (name) VALUES
  ('John Smith'),
  ('Maria Garcia'),
  ('Robert Johnson'),
  ('Emily Chen'),
  ('David Wilson'),
  ('Sarah Brown'),
  ('Michael Davis'),
  ('Lisa Anderson')
ON CONFLICT (name) DO NOTHING;

-- Insert sample land plots (ensuring they fit within 1000x800 land area)
DO $$
DECLARE
  john_id uuid;
  maria_id uuid;
  robert_id uuid;
  emily_id uuid;
  david_id uuid;
  sarah_id uuid;
  michael_id uuid;
  lisa_id uuid;
BEGIN
  -- Get person IDs
  SELECT id INTO john_id FROM people WHERE name = 'John Smith';
  SELECT id INTO maria_id FROM people WHERE name = 'Maria Garcia';
  SELECT id INTO robert_id FROM people WHERE name = 'Robert Johnson';
  SELECT id INTO emily_id FROM people WHERE name = 'Emily Chen';
  SELECT id INTO david_id FROM people WHERE name = 'David Wilson';
  SELECT id INTO sarah_id FROM people WHERE name = 'Sarah Brown';
  SELECT id INTO michael_id FROM people WHERE name = 'Michael Davis';
  SELECT id INTO lisa_id FROM people WHERE name = 'Lisa Anderson';

  -- Insert land plots for each person
  INSERT INTO land_plots (person_id, x, y, width, height) VALUES
    -- John Smith's plots
    (john_id, 50, 50, 150, 100),
    (john_id, 250, 50, 100, 150),
    
    -- Maria Garcia's plots
    (maria_id, 400, 50, 200, 120),
    (maria_id, 400, 200, 150, 100),
    
    -- Robert Johnson's plots
    (robert_id, 650, 50, 180, 200),
    
    -- Emily Chen's plots
    (emily_id, 50, 200, 120, 150),
    (emily_id, 200, 200, 100, 100),
    
    -- David Wilson's plots
    (david_id, 50, 400, 200, 150),
    (david_id, 300, 350, 150, 200),
    
    -- Sarah Brown's plots
    (sarah_id, 500, 350, 180, 180),
    
    -- Michael Davis's plots
    (michael_id, 700, 300, 150, 120),
    (michael_id, 700, 450, 120, 100),
    
    -- Lisa Anderson's plots
    (lisa_id, 50, 600, 250, 120),
    (lisa_id, 350, 600, 200, 150)
  ON CONFLICT DO NOTHING;
END $$;