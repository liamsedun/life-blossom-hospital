-- Create chat infrastructure for staff-patient and staff-to-staff real-time chat
-- Tables: chats, chat_messages, chat_presence

CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  patient_id uuid REFERENCES patients(id),
  staff_user_id uuid NOT NULL REFERENCES users(id),
  recipient_user_id uuid REFERENCES users(id),
  last_message text,
  last_sender_id uuid REFERENCES users(id),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((patient_id IS NOT NULL AND recipient_user_id IS NULL) OR (patient_id IS NULL AND recipient_user_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  org_id uuid NOT NULL REFERENCES organizations(id),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_staff ON chats(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_chats_patient ON chats(patient_id);
CREATE INDEX IF NOT EXISTS idx_chats_recipient ON chats(recipient_user_id);

-- RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY chats_select ON chats FOR SELECT USING (auth.uid() = staff_user_id OR auth.uid() = recipient_user_id OR auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id));
CREATE POLICY chats_insert ON chats FOR INSERT WITH CHECK (auth.uid() = staff_user_id);
CREATE POLICY chats_update ON chats FOR UPDATE USING (auth.uid() = staff_user_id);

CREATE POLICY chat_messages_select ON chat_messages FOR SELECT USING (chat_id IN (SELECT id FROM chats WHERE auth.uid() = staff_user_id OR auth.uid() = recipient_user_id OR auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)));
CREATE POLICY chat_messages_insert ON chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY chat_messages_update ON chat_messages FOR UPDATE USING (chat_id IN (SELECT id FROM chats WHERE auth.uid() = staff_user_id OR auth.uid() = recipient_user_id));

CREATE POLICY chat_presence_select ON chat_presence FOR SELECT USING (true);
CREATE POLICY chat_presence_insert ON chat_presence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY chat_presence_update ON chat_presence FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages, chat_presence;
