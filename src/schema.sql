
CREATE TABLE Employees (
    employee_id INT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    role VARCHAR(100)
);

CREATE TABLE AttendanceRecords (
    record_id INT PRIMARY KEY,
    employee_id INT,
    date DATE,
    time_in TIME,
    time_out TIME,
    FOREIGN KEY (employee_id) REFERENCES Employees(employee_id)
);

CREATE TABLE WorkTimeManagement (
    record_id INT PRIMARY KEY,
    employee_id INT,
    date DATE,
    worked_hours DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2),
    break_time DECIMAL(5, 2),
    FOREIGN KEY (employee_id) REFERENCES Employees(employee_id)
);

CREATE INDEX idx_employee_id ON Employees(employee_id);

CREATE INDEX idx_worktime_employee_id ON WorkTimeManagement(employee_id);
CREATE INDEX idx_worktime_date ON WorkTimeManagement(date);
