import React, { useContext, useEffect } from "react";
import { Grid, Card, CardBody, CardFooter, Heading, Text, Avatar, Button, Stack } from "@chakra-ui/react";
import { DataContext } from "../GameContext";
import MUECustomSlider from "../components/ui/swiper";
import { testSound } from "../utils";

export default function PlayersPage() {
    const { players, socket, setMessage } = useContext(DataContext);

    useEffect(() => {
        if (players && players.length > 0) {
            console.log(players[0]?.username);
        }
    }, [players]);

    if (!players || players.length === 0) {
        return <div>No players available</div>;
    }

    function startGame() {
        if (players.length > 0) {
            socket.emit('start_game', {});
        } else {
            setMessage({text: "At least 3 players are needed to start the game.", status: "warning"})
        }
    }

    function PlayerCard({ player }) {
        return (
            <Card.Root size="sm">
                <Card.Header>
                    <Heading size="md"> {player.username}</Heading>
                </Card.Header>
                <Card.Body color={player.alive ? "green" : "red"}>
                    {player.alive ? "Alive" : "Dead"}
                </Card.Body>
            </Card.Root>
        );
    }

    return (
        <div>
            <button className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors" onClick={testSound}>Test Sound</button>
            <Grid templateColumns="repeat(3, 1fr)" gap="6">
                {players.map((player) => (
                    <PlayerCard key={player.id} player={player} />
                ))}
            </Grid>
            <MUECustomSlider text={"Swipe to start game"} onSuccess={startGame} />;
        </div>
    );

}
