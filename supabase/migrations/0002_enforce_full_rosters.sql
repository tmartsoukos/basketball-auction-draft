-- Υποχρεωτικές πεντάδες: ο ανοίγων κάθε γύρου πρέπει να κάνει προσφορά, οπότε
-- κανένας παίκτης δεν μένει πια αδιάθετος και δεν χρειάζεται μέτρημα διαδοχικών pass.

alter table public.games drop column if exists no_bid_passes;

alter table public.game_pool drop constraint if exists game_pool_status_check;
update public.game_pool set status = 'pending' where status = 'unsold';
alter table public.game_pool
  add constraint game_pool_status_check check (status in ('pending', 'sold'));
