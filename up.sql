-- worked_time 列を追加（分単位の整数として時間差を保存）
ALTER TABLE AttendanceRecords ADD COLUMN worked_time INT;

-- 既存データに対して worked_time を計算して更新
-- 以下はMySQLの例ですが、データベースによって関数が異なる場合があります。
UPDATE AttendanceRecords
SET worked_time = TIMESTAMPDIFF(MINUTE, time_in, time_out);

-- 新しいレコードに対しては、INSERT または UPDATE 操作で worked_time を計算する
-- 例: 新しいレコードの挿入
-- INSERT INTO AttendanceRecords (user_id, date, time_in, time_out, worked_time)
-- VALUES (1, '2023-12-18', '08:00:00', '17:00:00', TIMESTAMPDIFF(MINUTE, '08:00:00', '17:00:00'));
