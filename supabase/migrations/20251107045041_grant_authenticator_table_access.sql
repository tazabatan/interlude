grant usage on schema public to authenticator;
grant usage on schema graphql_public to authenticator;
grant select on all tables in schema public to authenticator;
alter default privileges for role postgres in schema public grant select on tables to authenticator;
