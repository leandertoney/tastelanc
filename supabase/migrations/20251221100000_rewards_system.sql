-- Rewards Points System Migration
-- Creates tables for tracking user points, transactions, trivia questions, and responses

-- ============================================
-- Table 1: user_points - Current balance
-- ============================================
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points DECIMAL(10,1) NOT NULL DEFAULT 0,
  lifetime_points DECIMAL(10,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Users can read their own points
CREATE POLICY "Users can read own points" ON user_points
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage all points (for awarding)
CREATE POLICY "Service role full access on user_points" ON user_points
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);

-- ============================================
-- Table 2: point_transactions - Audit log
-- ============================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  points DECIMAL(10,1) NOT NULL,
  multiplier DECIMAL(3,1) DEFAULT 1.0,
  base_points DECIMAL(10,1) NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY "Users can read own transactions" ON point_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage all transactions
CREATE POLICY "Service role full access on point_transactions" ON point_transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_action_type ON point_transactions(action_type);
CREATE INDEX IF NOT EXISTS idx_point_transactions_restaurant_id ON point_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);

-- ============================================
-- Table 3: trivia_questions - Daily trivia pool
-- ============================================
CREATE TABLE IF NOT EXISTS trivia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  wrong_answers TEXT[] NOT NULL,
  category TEXT,
  difficulty TEXT DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  times_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trivia_questions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active questions
CREATE POLICY "Users can read active trivia questions" ON trivia_questions
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Service role can manage all questions
CREATE POLICY "Service role full access on trivia_questions" ON trivia_questions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin can manage questions
CREATE POLICY "Admin can manage trivia questions" ON trivia_questions
  FOR ALL TO authenticated
  USING (auth.email() = 'admin@tastelanc.com')
  WITH CHECK (auth.email() = 'admin@tastelanc.com');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trivia_questions_is_active ON trivia_questions(is_active);
CREATE INDEX IF NOT EXISTS idx_trivia_questions_category ON trivia_questions(category);
CREATE INDEX IF NOT EXISTS idx_trivia_questions_times_used ON trivia_questions(times_used);

-- ============================================
-- Table 4: trivia_responses - Track user answers
-- ============================================
CREATE TABLE IF NOT EXISTS trivia_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES trivia_questions(id) ON DELETE CASCADE,
  answered_correctly BOOLEAN NOT NULL,
  points_earned DECIMAL(10,1) NOT NULL,
  answered_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, answered_at)
);

-- Enable RLS
ALTER TABLE trivia_responses ENABLE ROW LEVEL SECURITY;

-- Users can read their own responses
CREATE POLICY "Users can read own trivia responses" ON trivia_responses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage all responses
CREATE POLICY "Service role full access on trivia_responses" ON trivia_responses
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trivia_responses_user_id ON trivia_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_trivia_responses_answered_at ON trivia_responses(answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_trivia_responses_user_date ON trivia_responses(user_id, answered_at);

-- ============================================
-- Trigger: Update updated_at on user_points
-- ============================================
CREATE OR REPLACE FUNCTION update_user_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_points_updated_at
  BEFORE UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_updated_at();

-- ============================================
-- Seed: Initial trivia questions
-- ============================================
INSERT INTO trivia_questions (question, correct_answer, wrong_answers, category, difficulty) VALUES
  ('What is the main ingredient in traditional Lancaster County chicken pot pie?', 'Square noodles', ARRAY['Rice', 'Potatoes', 'Bread'], 'local', 'easy'),
  ('Which famous market in Lancaster has been operating since 1889?', 'Central Market', ARRAY['Reading Terminal Market', 'Eastern Market', 'Pike Place Market'], 'local', 'easy'),
  ('What type of cuisine is shoofly pie associated with?', 'Pennsylvania Dutch', ARRAY['Southern', 'New England', 'Tex-Mex'], 'food', 'medium'),
  ('What is the primary sweetener used in traditional shoofly pie?', 'Molasses', ARRAY['Honey', 'Maple syrup', 'Brown sugar'], 'food', 'medium'),
  ('Lancaster is known as the heart of which agricultural community?', 'Amish Country', ARRAY['Wine Country', 'Dairy Country', 'Corn Belt'], 'local', 'easy'),
  ('What popular breakfast meat is Lancaster County famous for producing?', 'Scrapple', ARRAY['Bacon', 'Sausage', 'Ham'], 'food', 'medium'),
  ('Which street in Lancaster City is known for its restaurant scene?', 'North Queen Street', ARRAY['Main Street', 'King Street', 'Market Street'], 'local', 'medium'),
  ('What is a traditional Pennsylvania Dutch dessert made with apples?', 'Apple dumplings', ARRAY['Apple pie', 'Apple crisp', 'Apple strudel'], 'food', 'easy'),
  ('What type of pretzel is Lancaster County famous for?', 'Soft pretzels', ARRAY['Hard pretzels', 'Pretzel sticks', 'Pretzel bites'], 'food', 'easy'),
  ('Which beverage company was founded in Lancaster?', 'Turkey Hill', ARRAY['Hershey', 'Snapple', 'Arizona'], 'local', 'medium')
ON CONFLICT DO NOTHING;
