CREATE TRIGGER audit_entries_no_update BEFORE UPDATE ON audit_entries
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit entries are immutable';
CREATE TRIGGER audit_entries_no_delete BEFORE DELETE ON audit_entries
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit entries cannot be deleted';
