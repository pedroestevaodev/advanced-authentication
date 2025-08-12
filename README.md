# Advanced Authentication App (Next.js + NextAuth v5)

<p style="text-align: center;">
    <a href="https://www.youtube.com/@codewithantonio">
        <img src="https://res.cloudinary.com/dge3g9rcw/image/upload/v1747418825/github/sm9h61v21bpazbogclwj.webp" alt="Illustrative image" />
    </a>
</p>

This is a complete authentication solution built with **Next.js 14** and **NextAuth.js v5 (Auth.js)**. It features robust security practices and real-world features like **2FA**, **role-based access**, **OAuth**, **email verification**, and much more. All implemented using reusable components, server/client utilities, and middleware.

## About the Project

This project is the result of an in-depth tutorial that demonstrates how to implement production-grade authentication in a modern full-stack Next.js application.

What you'll find inside:

- Credentials & OAuth login (Google, GitHub)
- Two-Factor Authentication (2FA)
- Email verification flow
- Forgot/reset password feature
- Role-based access control (Admin & User)
- Protected server/client components & API routes
- User settings (change email, password, enable 2FA)
- Custom reusable auth components and hooks
- Session extension, callbacks, and middleware logic

> **Disclaimer:** This project is for **educational purposes only** and is not intended for production use without further customization.

## Tech Stack

This project leverages modern technologies and libraries:

- [Next.js (App Router)](https://nextjs.org/) - React framework for web applications.
- [React](https://react.dev/) - JavaScript library for building user interfaces.
- [TypeScript](https://www.typescriptlang.org/) - JavaScript superset for static typing.
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework for fast and customizable design.
- [NextAuth v5 (Auth.js)](https://authjs.dev/) - Authentication for the Web.
- [React Hook Form](https://react-hook-form.com/) (form handling)
- [Zod](https://zod.dev/) (form validation)
- [Resend](https://resend.com/) (email service)
- [Prisma ORM](https://www.prisma.io/) (serverless database)
- [SQLite](https://sqlite.org/index.html) (can be replaced with PostgreSQL)
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (salt cryptography)
- [Lucide Icons](https://lucide.dev/)

## Features

- **Email/Password Login**
- **Social Login with Google & GitHub**
- **Email Verification**
- **Forgot & Reset Password**
- **Two-Factor Authentication (2FA)**
- **User Roles:** Admin & User
- **Protect Client/Server Components and API Routes**
- **Role-based UI Rendering (with RoleGate)**
- **Change Email (with re-verification)**
- **Change Password (with current password confirmation)**
- **Enable/Disable 2FA in User Settings**
- **Reusable Hooks:** useCurrentUser, useRole**
- **Reusable Utilities:** currentUser, currentRole**
- **Session Callbacks & Middleware Integration**

## Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/pedroestevaodev/advanced-authentication.git
cd advanced-authentication
```

### 2. Install dependencies

```bash
$ bun install
```

### 3. Environment Variables

Create a `.env.local` file in the root and configure the following variables:

```bash
DATABASE_URL="tobemodified"
DIRECT_DATABASE_URL="tobemodified"
AUTH_SECRET="tobemodified"
AUTH_URL="http://localhost:3000"
APPLICATION_URL="http://localhost:3000"
GITHUB_CLIENT_ID="tobemodified"
GITHUB_CLIENT_SECRET="tobemodified"
GOOGLE_CLIENT_ID="tobemodified"
GOOGLE_CLIENT_SECRET="tobemodified"
RESEND_API_KEY="tobemodified"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Set Up the Database

```bash
bunx prisma generate
bunx prisma db push
```

You can preview the database schema in `prisma/schema.prisma`.

### 5. Start the Development Server

```bash
bun run dev
```

Visit `http://localhost:3000` to see the application running.

## Available Commands

| Command               | Description                         |
| --------------------- | ----------------------------------- |
| `dev`                 | Starts the development server       |
| `build`               | Builds the app for production       |
| `start`               | Runs the production build           |
| `lint`                | Runs ESLint for code quality        |
| `prisma:migrate-dev`  | Creates & applies new dev migration |
| `prisma:migrate-prod` | Applies pending prod migrations     |
| `prisma:generate`     | Generates Prisma client             |
| `prisma:reset`        | Deletes all migrations              |
| `postinstall`         | Runs setup script after install     |

## Resources

To learn more about the stack used in this project:

- [Next.js Docs](https://nextjs.org/docs) - Learn more about Next.js features and APIs.
- [Next.js Learn](https://nextjs.org/learn) - Interactive tutorial to learn Next.js.
- [React Docs](https://pt-br.react.dev/learn) - Access the official React guide.
- [Tailwind CSS Docs](https://tailwindcss.com/docs) - Learn how to use Tailwind CSS to style your application.
- [Auth.js](https://authjs.dev/) - Access the official Auth.js guide.
- [Resend Docs](https://resend.com/docs/introduction) - Learn how to get Resend set up in your project.


## Deployment

The easiest way to deploy your Next.js application is by using the [Vercel Platform](https://vercel.com/new), created by the developers of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

> Make sure to set the environment variables in Vercel > Settings > Environment Variables.  
> Consider switching to PostgreSQL for production environments.

## License

This project is open source and available under the [MIT License](https://mit-license.org/).  
<br />

---

<br />

**Built with ☕ by [Pedro Estevão](https://www.pedroestevao.com)**










