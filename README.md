# Customer Relationship Manager

A web-based application for managing customer relationships, tracking calls and visits, and maintaining product information.

## Features

- Customer management with detailed information
- Product tracking with average tonnage
- Automated reminders for calls and visits
- Daily notifications for scheduled tasks
- Comprehensive reporting and analytics
- Modern, responsive UI

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Supabase account

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd customer-relationship-manager
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase database tables:

```sql
-- Customers table
create table customers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  company text not null,
  address text,
  sector text,
  contact_person text,
  call_interval integer not null default 2,
  visit_interval integer not null default 7,
  last_call_date timestamp with time zone,
  last_visit_date timestamp with time zone,
  next_call_date timestamp with time zone not null,
  next_visit_date timestamp with time zone not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Products table
create table products (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references customers(id) on delete cascade,
  name text not null,
  average_tonnage numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reminders table
create table reminders (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references customers(id) on delete cascade,
  type text not null check (type in ('call', 'visit')),
  due_date timestamp with time zone not null,
  completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

5. Start the development server:
```bash
npm run dev
```

## Usage

1. Add customers with their details and products
2. Set call and visit intervals
3. View daily tasks on the dashboard
4. Receive notifications for scheduled tasks
5. Track completed calls and visits
6. View reports and analytics

## Technologies Used

- React
- TypeScript
- Material-UI
- Supabase
- Service Workers for notifications
- FullCalendar for scheduling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
