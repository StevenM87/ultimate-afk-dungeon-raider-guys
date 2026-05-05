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

### Ultimate AFK Dungeon Raider Guys

Ultimate AFK Dungeon Raider Guys is a simple game where user characters asynchronhously battle another random character every 30 minutes, allowing them to earn experience points to level up, and gold to purchase equips and potions from the shop. Users can view their position on the leaderboard, which displays the number of wins and losses of all characters.

The purpose of this game, like any game, is for the players to have some level of fun. The simplicity of this game allows it to be played at leisure, as players will be inclined to make their game decisions (such as what to purchase and equip), take a break, and then come back later once a few rounds of the game have passed. This simple, cyclical style of gameplay is built on the backend simulating rounds for every 30 minutes of real world time. Further features allowing for more user interaction (such as more control over when their characters battle and rest, or more control over how their stats are boosted at level up) would be another step towards allowing users to interact with their character while still maintaining the game's simple nature.

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

### Frontend

The project has two standalone frontends (user and admin) built with React.

#### Login

* Login validates against existing backend users data.
* Only accounts with `role = admin` are allowed to log into the admin portal.
* Only accounts with `role = user` are allowed to log into the user portal.
* Session is stored in browser `sessionStorage` and cleared on logout.

#### Currently Supported Admin Actions

* View users (moderation list UI).
* View bots list.
* Create potions via `POST /potions`.
* Create equips via `POST /equips`.
* View current equips list.

#### Currently Supported User Actions

* View character stats, level, gold, equips, and potions.
* Purchase equips and potions from the shop.
* Equip equips and use potions from the inventory.
* View leaderboard.

### Backend

The backend is built with expressjs, and it serves as the point of transfer between the frontends and database, while also running the game battling logic.

#### Tables

There are 10 tables in the database:

* users: Represents a user with their credentials, role (user, admin, bot), status (active or banned), and gold
* characters: Users have player characters who participate in the battling simulation, bots have bot characters who are also part of the simulation
* equips: A table of all the equips and their stats
* potions: A table of all the potions and their healing amounts
* user_equips: Equips purchased by a user that are not currently equipped to any character
* user_potions: Potions purchased by a user that they can use on their characters
* character_equips: These are the equips currently equipped on each character
* battles: Table that stores the result of every battle (winner, loser, and the round number)
* last_update: Singleton table, it contains the time of the last update to the simulation, and what the next round's number is, used by the simulation to detect when to run rounds
* updating: Singleton table, it contains an entry that indicates if there is a backend running the simulation somewhere, and the last time that backend indicated that it was running (if a backend somehow hangs while running, this prevents the backend from being stuck by freeing it after a certain amount of time with no updates)

#### Routes

The backend has 31 routes:

##### User Routes

* GET `/users` route that gets all users
* POST `/users` route that creates a user (requires username, password, role)
* GET `/users/roles/:role` route that gets all users with a specific role
* GET `/users/:user_id` route that gets a user by user_id
* DELETE `/users/:user_id` route that deletes a user by user_id (cannot delete admins)
* PUT `/users/:user_id/ban` route that bans a user by user_id (cannot ban admins)
* POST/PUT `/users/:user_id/buy/:type/:item_id` route that allows a user to buy an item (equip or potion)
* GET `/users/:user_id/characters` route that gets all characters for a user
* POST `/users/:user_id/characters` route that creates a character for a user (requires character_name, optional character_type)
* GET `/users/:user_id/characters/:character_id` route that gets a specific character for a user
* DELETE `/users/:user_id/characters/:character_id` route that deletes a character for a user (returns equipped items to inventory)
* POST/PUT `/users/:user_id/characters/:character_id/equip/:slot/:item_id` route that equips an item to a character
* POST/PUT `/users/:user_id/characters/:character_id/potion/:item_id` route that uses a potion on a character
* PUT `/users/:user_id/earn` route that adds gold to a user (requires gold in body)
* GET `/users/:user_id/equips` route that gets all equips owned by a user
* GET `/users/:user_id/potions` route that gets all potions owned by a user
* PUT `/users/:user_id/gold` route that sets a user’s gold (requires gold in body)

##### Character Routes

* GET `/characters` route that gets all characters
* GET `/characters/battles` route that gets all battles
* GET `/characters/battles/:character_id` route that gets all battles for a character
* GET `/characters/records` route that gets win/loss records for all characters
* GET `/characters/records/:character_id` route that gets win/loss record for a character
* GET `/characters/:character_id` route that gets a character by character_id
* GET `/characters/:character_id/equips` route that gets all equips for a character

##### Item Routes

* GET `/equips` route that gets all equips
* POST `/equips` route that creates an equip (requires equip_name, equip_type, boost_type, boost_amount, cost)
* DELETE `/equips/:equip_id` route that deletes an equip by equip_id
* GET `/potions` route that gets all potions
* POST `/potions` route that creates a potion (requires potion_name, cost, heal_raw, heal_percent)
* DELETE `/potions/:potion_id` route that deletes a potion by potion_id

##### Additional Route

* POST `/rounds` route that adds simulation rounds (requires rounds as a positive integer in body)

####