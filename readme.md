# CSE264 Final Project: Full Stack
## Due: Friday, May 2, 2025 at 11:59 PM
## Add your full name and Lehigh email address to this README!
Steven McPhillimey slm526@lehigh.edu, Demetri Kostas dek226@lehigh.edu, David Chen dac326@lehigh.edu

### Project Requirements
Your web application should have/do the following:

Your web application must include the following:
* User Accounts & Roles: Implement different user roles such as user/admin, free/paid, etc.
* Database: Your application must store and retrieve data from a database of your choice.
* Interactive UI: Your web app must have an interactive user interface, which can include forms, real-time updates, animations, or other dynamic elements.
* New Library or Framework: You must use at least one library or framework that was not covered in class.
* Internal REST API: Your project must have an API layer used to store and retrieve data
* External REST API: You may include an external REST API (e.g., Reddit API, Spotify API, OpenWeather API, etc.).

### Installation and Running the Project

#### Client
The client for this project uses React + Vite template which provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

You must have node.js running on your machine. Once you have cloned this project you can run `npm install` to install all the packages for this project. Then running `npm run dev` will run the dev version of this code, which will run this project on localhost:5173 (or at the location specified in the console).

#### Server
You must have node.js running on your machine. Once you have cloned this project you can run `npm install` to install all the packages for this project. Then running `npm run dev` will run the dev version of this code, which will run this project with nodemon. Nodemon auto-restarts the node server every time you make a change to a file. This is very helpful when you are writing and testing code.

##### .env and Postgres Installation

A Postgres instance may have been provided to you. Your username for the database is your 6 character alphanumeric lehigh id. Your password for the database is your 6 character alphanumeric lehigh id followed by '_lehigh'.

You will need to create a .env from the .env.example You can do this by running this line of code in your terminal 

`cp .env.example .env`

Then store your Database credentials in your .env file.

**Note: Never EVER push private information (like credentials) to a Git Repo. We use .env to store this connection information and ensure that git (using .gitignore) never pushes this private information in the repo. Never ever store real credentials in .env.example or anywhere that is not .env as you may push these changes to your git repo.**

### Grading
* **Project Functionality** -- **30 points** -- Meets all outlined requirements
* **Technical Implementation** -- **25 points** -- Clean code, database integration, API Usage
* **UI/UX & Interactivity** -- **15 points** -- Well-designed, intuitive, and responsive UI
* **Use of New Tech** -- **10 points** -- Implements a library/framework not covered in class
* **Project Documentation** -- **10 points** -- Clear README, installation guide, and API setup
* **Presentation & Demo** -- **10 points** -- Engaging, clear explanation, and live demo

**If code doesn't run/compile you can get no more than a 60. But please write comments and a README to explain what you were trying to do.**

## 1. Project Overview

### Project Name

Ultimate AFK Dungeon Raider Guys

## 2. Team Members & Roles

Our Team:

* David Chen: Frontend (Admin)  
* Demetri Kostas: Frontend (User)
* Steven McPhillimey: Database, Backend/Application Logic

## 3. Application Features

* The Ultimate AFK Dungeon Raider Guys project satisfies all project requirements by implementing a multi-role system that distinguishes between Players, who engage in PVP battles, and Admins, who manage game content and moderate users.
* The application utilizes Supabase as its core database * to store and retrieve game states.
* The frontend is built using React to provide an interactive UI featuring dynamic character customization and live leaderboards.
* To fulfill the framework requirement, we will use react-hook-form for advanced input validation and MUI for specialized UI components.
* The app uses an internal REST API layer written in JavaScript that sits between the client and the database to process web requests and game updates to ensure seamless data flow across the application.


## 4. Installation & Setup Instructions

1. Clone repo with `git clone https://github.com/StevenM87/ultimate-afk-dungeon-raider-guys.git`
2. Start the server from `server/`:
   * `npm install`
   * `npm run dev`
3. Start the client from `client/`:
   * `npm install`
   * `npm run dev`
4. Open the admin portal at:
   * `http://localhost:5173/admin.html`
5. Open the player portal at:
   * `http://localhost:5173/user.html`

## 5. API Keys & Database Setup

### Admin Portal Frontend

The project now includes a standalone admin frontend built with React.

#### Admin Login

- Login validates against existing backend users data.
- Only accounts with `role = admin` are allowed.
- Session is stored in browser `sessionStorage` and cleared on logout.

#### Currently Supported Admin Actions

- View users (moderation list UI).
- View bots list.
- Create potions via `POST /potions`.
- Create equips via `POST /equips`.
- View current equips list.

#### Current Backend Limitations

- Ban/delete users and bot create/delete actions are displayed in the UI as pending actions because dedicated moderation endpoints are not currently present in the backend.
