-- Bcc from the sender's stored RFC 5322 copy. Recipients do not receive this header.

ALTER TABLE mail_messages ADD COLUMN bcc_addresses TEXT[];
