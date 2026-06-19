This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## TaskPilot Authentication Setup

### Forgot Password Flow

TaskPilot implements a secure password recovery flow using Supabase Authentication. The flow works as follows:
1. **Request Reset Link**: The user navigates to `/auth/forgot-password` and enters their email address.
2. **Email Sent**: Supabase securely generates a reset link and sends it to the provided email. For security, the UI always shows a generic success message regardless of whether the email exists in the system.
3. **Reset Password**: The user clicks the link in their email and is directed to `/auth/reset-password`. The URL contains a securely signed recovery token.
4. **Update Password**: The user enters a new password (min. 8 characters) and confirms it. The form validates the token session, submits the new password, and safely signs the user out.
5. **Login**: The user is redirected to the `/login` page to sign in with their new credentials.

### Required Environment Variables

Ensure your `.env.local` file contains the required Supabase configuration parameters:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Your local or production domain
```

### Supabase Redirect URL Configuration

To ensure the password recovery link properly returns to your application, you must add the callback URLs in your Supabase Dashboard:

1. Navigate to your Supabase Project Dashboard.
2. Go to **Authentication** > **URL Configuration**.
3. Under **Site URL**, add your base application URL (e.g., `http://localhost:3000`).
4. Under **Redirect URLs**, add the callback URL:
   - `http://localhost:3000/callback`

### Testing Instructions

To run the Vitest test suites, including the validation schemas and password recovery logic:

```bash
npm run test
# or specifically for auth flows
npx vitest tests/auth-flow.test.ts
```

This will run client-side validation logic tests ensuring the reset form checks for matching passwords and valid emails, as well as simulating the Supabase API success and error paths.

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
