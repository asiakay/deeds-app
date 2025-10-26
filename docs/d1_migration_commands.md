# D1 Migration & Verification Commands

## Apply migrations
```
npx wrangler d1 migrations apply DEEDS_DB
```

## Seed test data
```
npx wrangler d1 execute DEEDS_DB --file=./migrations/0004_seed_test_data.sql
```

## Verify deed flow
1. Submit a deed via the local form at `public/submit.html` or deploy to your Worker.
2. Mark the deed as verified:
   ```
   curl -X POST https://<your-worker>.workers.dev/api/verify \
     -H "Content-Type: application/json" \
     -d '{"deed_id": 1}'
   ```
3. Confirm the user's credits incremented:
   ```
   npx wrangler d1 execute DEEDS_DB --command "SELECT * FROM users;"
   ```

## Rollback seed data
```
npx wrangler d1 execute DEEDS_DB --command "DELETE FROM deeds WHERE user_id = 1 AND title = 'Delivered groceries' AND proof_url = 'https://photos.app/test.jpg'; DELETE FROM users WHERE id = 1 AND email = 'test@example.com';"
```
