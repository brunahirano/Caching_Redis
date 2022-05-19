//axios vai ser responsável por acessar nossas url

const express = require("express");
const axios = require("axios");
const redis = require("redis");

const PORT = 5000;
const REDIS_PORT = 6379;

//API free que lista uma casa específica de Harry Potter, tô usando a 0367baf3-1cb6-4baf-bede-48e17e1cd0055
const BASE_URL = "https://wizard-world-api.herokuapp.com/Houses/";

const app = express();

//essa função que vamos criar em client para conectar a ele
//a porta padrão que o redis roda é 6379, então vamos atribuir a sua configuração
let client = redis.createClient({
    port: REDIS_PORT, 
    legacyMode: true
});

//este é um caso de função auto executável na javascript para que possamos conectar ao redis, 
//lembrando que await aqui só vai funcionar dentro de uma função async
(async() => {
    await client.connect();
    console.log("Estamos conectados ao redis")
})();


//get stats irá pegar a informação da id informado
//com o axios irá bater na ul externa e trazer seus dados,
//antes de retornarmos a resposta, setamos esses dados na redis, usando o client.set e passando como chave principal 
const getStats = async (req, res, next) =>{
    try {
        const { id } = req.params;
        const response = await axios.get(`${BASE_URL}${id}`);
        const data = response.data;
        const { name, houseColours, founder} = data;
        const houseDetails = `A casa ${name}, tem a cor ${houseColours}, foi fundada por ${founder}`

        client.set(id, houseDetails); //Seta no redis as informações da casa, passando como chave seu id
        response.send(houseDetails);
    }catch(error) {
        console.error(error);
        res.status(500)
    }
};

//Aqui criamos o middleware de cache para buscar, através do client.get, do Redis a informação pelo ID.
const cache = async (req, res, next) => {
    const { id } = req.params;

    await client.get(id, (err, data) =>{
        if(err) throw err;
        if(data) {
            res.send(data);
        } else { 
            next();
        }
    })
}

//iniciamos nossa api na porta que setamos 
app.listen(PORT, ( ) => {
    console.log(`Server running on port ${PORT}`);
})

//definimos a rota, e antes de setar o endpoint principal, passamos o middlreware: cache
app.get("/house/:id", cache, getStats);

module.exports = app;