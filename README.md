# DataWizard

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Webpack](https://img.shields.io/badge/Webpack-8DD6F9?style=for-the-badge&logo=webpack&logoColor=black)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-000000?style=for-the-badge&logo=openai&logoColor=white)
![Material UI](https://img.shields.io/badge/Material%20UI-0081CB?style=for-the-badge&logo=mui&logoColor=white)
![Babel](https://img.shields.io/badge/Babel-F9DC3E?style=for-the-badge&logo=babel&logoColor=black)
![CORS](https://img.shields.io/badge/CORS-2E8B57?style=for-the-badge&logo=cors&logoColor=white)
![CSS Loader](https://img.shields.io/badge/CSS%20Loader-2A9D8F?style=for-the-badge&logo=css3&logoColor=white)
![dotenv](https://img.shields.io/badge/dotenv-72A98D?style=for-the-badge&logo=dotenv&logoColor=white)

**DataWizard** is a powerful tool that uses OpenAI to generate SQL queries and populate databases with information based on user input. Simply tell DataWizard how many rows and tables you want, specify the type of information (e.g., pizza store locations, menu items, employees), and provide a link to your database. DataWizard will create the SQL queries and execute them to populate your database automatically.

## Features

- **Generate SQL Queries Automatically:** Using OpenAI, DataWizard generates SQL queries based on the information you specify, saving time on manual query writing.
- **Populate Your Database:** After generating the SQL queries, DataWizard will send the queries to your database to populate it with the specified data.
- **Flexible Inputs:** Specify how many rows and tables you want, along with the type of information needed (e.g., "pizza store locations, menu items, and employees").
- **Database Integration:** Easily connect to your database by pasting the link to your database in the application, and let DataWizard handle the rest.
- **Error-Free Query Generation:** DataWizard ensures that the generated queries are syntactically correct and optimized for your database.

## Technologies Used

- **Frontend:** React.js for building an interactive and user-friendly interface.
- **Backend:** Node.js with Express.js to handle API requests and server-side logic.
- **AI Integration:** OpenAI's GPT-3 for generating SQL queries based on user input.
- **Database Interaction:** Send SQL queries to the database using a connection string.
- **Testing:** Jest for unit and integration tests, along with React Testing Library for frontend testing.
- **API Testing:** Supertest for testing the backend APIs.
- **Build Tools:** Webpack for bundling and optimizing the frontend.

## How It Works

1. **User Input:**

   - Enter how many tables and rows you need in your database.
   - Specify the type of information you want (e.g., "pizza store locations, menu items, and employees").
   - Paste the link to your database connection (e.g., PostgreSQL, MySQL).

2. **SQL Query Generation:**

   - DataWizard uses OpenAI's GPT-3 to generate the appropriate SQL queries based on your input.

3. **Database Population:**

   - Once the SQL queries are generated, DataWizard executes them on your database to populate it with the data.

4. **Database Confirmation:**
   - DataWizard will show you the status of the query execution, ensuring your database is populated correctly.

## Installation

### Prerequisites

- Node.js (v14 or above)
- A database (PostgreSQL, MySQL, or any SQL-based database)
- OpenAI API Key for generating SQL queries

### Steps to Set Up Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/datawizard.git
   cd datawizard
   ```

2. Install the dependencies:

   **For backend (Node.js & Express):**

   ```bash
   cd backend
   npm install
   ```

   **For frontend (React):**

   ```bash
   cd frontend
   npm install
   ```

3. Set up environment variables:

   Create a `.env` file in the **backend** directory and add your credentials:

   ```bash
   OPENAI_API_KEY=your_openai_api_key
   DATABASE_URL=your_database_connection_url
   ```

4. Run the application locally:

   **Start the backend server:**

   ```bash
   cd backend
   npm run server
   ```

   **Start the frontend development server:**

   ```bash
   cd frontend
   npm start
   ```

   Your application will be accessible at `http://localhost:3000`.

## Testing

To ensure DataWizard works as expected, we have written tests for both the backend and frontend.

### Run Unit Tests

To run unit tests with Jest, navigate to the backend directory and run:

```bash
cd backend
npm run test
```

## Contributing

We welcome contributions to make DataWizard even better! To contribute:

1. Fork the repository.
2. Create a new branch for your feature (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

Please ensure that your changes follow the coding standards, and provide tests where applicable.

## License

DataWizard is licensed under the MIT License. See [LICENSE](LICENSE) for more details.
