import axios from 'axios';

module.exports = async (req, res) => {
    const { id } = req.query;

    console.log('twitch user id:', id);

    try {
        const twitchRes = await axios.get(`https://api.twitch.tv/helix/users?id=${id}`, {
            headers: {
                Authorization: `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`
            }
        });

        console.log('twitchRes:', twitchRes);

        if (twitchRes.status === 200 && twitchRes.data.data.length === 1) {
            res.status(200).send(twitchRes.data.data[0].login);
        } else {
            res.status(400).send('Could not find a Twitch user for the provided User ID');
        }
    } catch (err) {
        console.log(`Error getting Twitch username: ${err}`);
        res.status(500).send('An error occurred fetching Twitch username');
    }
};