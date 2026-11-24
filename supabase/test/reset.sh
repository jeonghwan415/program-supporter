psql -h /tmp -p 5433 -U postgres -q -d t -c "truncate auth.users, public.centers, public.join_attempts cascade;"
