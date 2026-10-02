-- ===================================================================
-- ESQUEMA RELACIONAL POSTGRESQL PARA EL SISTEMA GT (GESTIÓN DE TUTORÍAS)
-- ===================================================================

CREATE TABLE IF NOT EXISTS careers (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code_prefix VARCHAR(10) DEFAULT '',
  number_of_semesters INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) DEFAULT '',
  full_name VARCHAR(150) NOT NULL,
  alias VARCHAR(100) DEFAULT '',
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  role VARCHAR(30) NOT NULL,
  account VARCHAR(50) DEFAULT '',
  campus_id VARCHAR(50) DEFAULT '',
  campus_name VARCHAR(100) DEFAULT '',
  career_id VARCHAR(50) DEFAULT '',
  career_name VARCHAR(100) DEFAULT '',
  birth_date VARCHAR(50) DEFAULT '',
  admission_date VARCHAR(50) DEFAULT '',
  semester INT DEFAULT 0,
  photo_url TEXT DEFAULT '',
  observations TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  must_change_password BOOLEAN DEFAULT FALSE,
  created_at VARCHAR(50) DEFAULT ''
);

-- Soporte para bases de datos creadas antes del campo semester
ALTER TABLE users ADD COLUMN IF NOT EXISTS semester INT DEFAULT 0;

-- Soporte para bases de datos creadas antes del cambio obligatorio de contraseña
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) DEFAULT '',
  credits INT DEFAULT 0,
  semester INT DEFAULT 0,
  career_id VARCHAR(50) DEFAULT '',
  career_name VARCHAR(100) DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE
);

-- Soporte para bases de datos creadas antes del campo semester
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS semester INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS schedule_slots (
  id VARCHAR(100) PRIMARY KEY,
  start_time VARCHAR(20) NOT NULL,
  finish_time VARCHAR(20) NOT NULL,
  label VARCHAR(50) NOT NULL,
  is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sections (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  capacity INT DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE
);

-- Soporte para bases de datos creadas antes del campo capacity
ALTER TABLE sections ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS teacher_availability (
  id VARCHAR(100) PRIMARY KEY,
  teacher_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_name VARCHAR(150) NOT NULL,
  schedule_slot_id VARCHAR(100) NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
  schedule_label VARCHAR(50) NOT NULL,
  subject_course_id VARCHAR(100) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  subject_course_name VARCHAR(150) NOT NULL,
  is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tutorings (
  id VARCHAR(100) PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  details TEXT NOT NULL,
  reserv_date VARCHAR(50) NOT NULL,
  request_date VARCHAR(50) NOT NULL,
  modality INT NOT NULL,
  status INT NOT NULL,
  space TEXT DEFAULT '',
  block TEXT DEFAULT '',
  cancel_reason TEXT DEFAULT '',
  subject_course_id VARCHAR(100) NOT NULL,
  subject_course_name VARCHAR(150) NOT NULL,
  teacher_id VARCHAR(100) NOT NULL,
  teacher_name VARCHAR(150) NOT NULL,
  petitioner_student_id VARCHAR(100) NOT NULL,
  petitioner_student_name VARCHAR(150) NOT NULL,
  schedule_slot_id VARCHAR(100) NOT NULL,
  schedule_label VARCHAR(50) NOT NULL,
  approved_by_id VARCHAR(100),
  approved_by_name VARCHAR(150),
  start_time VARCHAR(50),
  finish_time VARCHAR(50),
  score INT DEFAULT 0,
  student_comment TEXT,
  teacher_comment TEXT,
  attachment_name VARCHAR(255),
  attachment_url TEXT DEFAULT '',
  created_at VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS tutoring_assistants (
  id VARCHAR(100) PRIMARY KEY,
  tutoring_id VARCHAR(100) NOT NULL REFERENCES tutorings(id) ON DELETE CASCADE,
  student_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_name VARCHAR(150) NOT NULL,
  student_account VARCHAR(50) DEFAULT '',
  student_phone VARCHAR(50) DEFAULT '',
  student_email VARCHAR(150) DEFAULT '',
  is_petitioner BOOLEAN DEFAULT FALSE,
  has_attended BOOLEAN DEFAULT FALSE,
  joined_at VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS tutoring_ratings (
  id VARCHAR(100) PRIMARY KEY,
  tutoring_id VARCHAR(100) NOT NULL REFERENCES tutorings(id) ON DELETE CASCADE,
  student_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_name VARCHAR(150) NOT NULL,
  score INT NOT NULL,
  student_comment TEXT DEFAULT '',
  created_at VARCHAR(50) NOT NULL,
  UNIQUE (tutoring_id, student_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(100) PRIMARY KEY,
  destination_user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  tutoring_id VARCHAR(100) DEFAULT '',
  is_read BOOLEAN DEFAULT FALSE,
  created_at VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS binnacle (
  id VARCHAR(100) PRIMARY KEY,
  type_event VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  username VARCHAR(100) NOT NULL,
  ip_address VARCHAR(50) DEFAULT '127.0.0.1',
  date_event VARCHAR(50) NOT NULL,
  hour_event VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS institution (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  vision TEXT DEFAULT '',
  mission TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(150) DEFAULT '',
  logo TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(100) UNIQUE NOT NULL,
  expires_at BIGINT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at VARCHAR(50) NOT NULL
);

-- Catálogo de asignaturas asignadas a cada docente (autoritativo)
CREATE TABLE IF NOT EXISTS teacher_subjects (
  teacher_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id VARCHAR(100) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);

