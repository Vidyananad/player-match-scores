const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertPlayerDbToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchDetailsDbToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

const convertPlayerMatchScoreDbToResponseObject = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
   SELECT
     *
   FROM
      player_details;`;
  const playerArray = await database.all(getPlayersQuery);
  response.send(
    playerArray.map((eachPlayer) => convertPlayerDbToResponseObject(eachPlayer))
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
    SELECT 
      *
    FROM 
      player_details
    WHERE 
      player_id = ${playerId};`;
  const player = await database.get(getPlayerQuery);
  response.send(convertPlayerDbToResponseObject(player));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerName } = request.body;
  const { playerId } = request.params;
  const updatePlayerQuery = `
            UPDATE
              player_details
            SET
              player_name = '${playerName}'
            WHERE
              player_id = ${playerId};`;
  await database.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `
    SELECT 
      *
    FROM 
      match_details
    WHERE 
      match_id = ${matchId};`;
  const match = await database.get(getMatchQuery);
  response.send(convertMatchDetailsDbToResponseObject(match));
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesQuery = `
    SELECT
      *
    FROM
      player_match_score
      NATURAL JOIN match_details
      WHERE 
      player_id= ${playerId};
    `;
  const matches = await database.all(getMatchesQuery);
  response.send(
    matches.map((eachMatch) => convertMatchDetailsDbToResponseObject(eachMatch))
  );
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchesQuery = `
    SELECT
      *
    FROM
      player_details
      NATURAl JOIN player_match_score
      WHERE match_id= ${matchId};
    `;
  const matches = await database.all(getMatchesQuery);
  response.send(
    matches.map((eachMatch) => convertPlayerDbToResponseObject(eachMatch))
  );
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScoresQuery = `
    SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
      `;
  const playerScores = await database.get(getPlayerScoresQuery);
  response.send({
    playerId: playerScores["playerId"],
    playerName: playerScores["playerName"],
    totalScore: playerScores["totalScore"],
    totalFours: playerScores["totalFours"],
    totalSixes: playerScores["totalSixes"],
  });
});

module.exports = app;
