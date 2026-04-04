alter table time_blocks add column if not exists rule_id uuid references wr_recurring_rules(id) on delete set null;
