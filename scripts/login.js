const needle = require("needle");

const config = require("../configs").configBuilder;

async function loginToBoard() {
    const login = config.login;
    const password = config.password;
    const url = config.url;

    if (!login || ! password || !url) {
        throw new Error('Нет данных для логина, проверь логин, пароль и ссылку на форум в конфиге');
    }

    const params = new URLSearchParams({
        method: 'board.auth',
        login,
        password,
    }).toString();

    try {
        console.log(`> Логинюсь ${login}`);
        const response = await needle('get', `${url}/api.php?${params}`);
        console.log('> Логин успешный')
        return response?.body?.response?.hash;
    } catch (error) {
        console.log('> Не удалось залогиниться')
        throw error;
    }
}


module.exports = {
    loginToBoard,
};