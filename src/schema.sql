CREATE TABLE Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100),
    email VARCHAR(255),
    role VARCHAR(100)
);

CREATE TABLE AttendanceRecords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT,
    date DATE,
    time_in TIME,
    time_out TIME,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE WorkTimeManagement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT,
    date DATE,
    worked_hours DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2),
    break_time DECIMAL(5, 2),
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE INDEX idx_user_id ON Users(id);

CREATE INDEX idx_worktime_user_id ON WorkTimeManagement(user_id);
CREATE INDEX idx_worktime_date ON WorkTimeManagement(date);