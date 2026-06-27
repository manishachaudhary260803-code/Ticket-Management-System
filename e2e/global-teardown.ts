// Data cleanup runs at the START of global-setup so the test database
// is preserved after each run — useful for inspecting state after a failure.
// Drop ticket_db_test manually if a full reset is needed:
//   psql postgres -c "DROP DATABASE ticket_db_test"
export default async function globalTeardown() {}
