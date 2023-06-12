const express = require('express');
const app = express();

const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');

const axios = require('axios');
const querystring = require('node:querystring');
const cors = require('cors');

const mysql = require('mysql2/promise');
const mysql_noPromise = require('mysql2');
const bluebird = require('bluebird');

// const { norm } = require('@tensorflow/tfjs');

////////////////////////////////////////////
const CLIENT_ID = '3c8964e532884a45bad2be1c7eabc097',
CLIENT_SECRET = '93cd7c54e04d425597327da2c3294615',
REDIRECT_URI = 'http://localhost:8080/callback',
SCOPE = 'user-library-modify playlist-modify-public user-library-read',
PORT = 8080;
let user_id, goodPlay_id, badPlay_id, access_token;

const goodSongs = [], badSongs = [];
let tModel;

let spotHeader; let testerGoodValue=null, testerBadValue=null;
////////////////////////////////////////////

// app.use(express.json());
app.use( cors({
    origin: '*'
}));

app.use( express.json() )

///////////////////////////////////////////

const server = app.listen(PORT, '127.0.0.1', (err)=>{
    if(err) console.log(err);

    const host = server.address().address;
    const portVerify = server.address().port;

    console.log(`Server listening at http://${host}:${portVerify}...`)
})

app.get('/login', async(req, res) => {

    res.json(
        "<a id='authBtn' href='https://accounts.spotify.com/authorize?client_id="+CLIENT_ID+"&response_type=code&scope="+SCOPE+"&redirect_uri="+REDIRECT_URI+"'>"
        + "<button type='button' class='btn btn-outline-primary' style='margin-left: 15px;'>Sign In</button>"
        + "</a>"
    );

})

app.get('/callback', async(req, res) => {

    let code = req.query.code;
    if(!code)
        console.log('code error!');

    const url = 'https://accounts.spotify.com/api/token';
    const data = {
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
    };
    const header = {
        headers: {
            Authorization: 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')),
            "Content-Type": "application/x-www-form-urlencoded"
        }
    };
    
    ///should console log token
    await axios.post(url, data, header)
        .then( d => {
            spotHeader = {
                headers: {
                    Authorization: "Bearer " + d.data.access_token,
                    "Content-Type": "application/json",
                }
            } 
            // console.log(spotHeader)
        })
    
    res.sendFile('/Users/daivdthiuta/vscode/getTransition/home.html');
})

app.get('/getSongIDs', async(req, res) => {
    //get user ID
    await axios.get('https://api.spotify.com/v1/me', spotHeader)
        .then( d => user_id = d.data.id);

    //get user playlists that match transition name
    await axios.get(`https://api.spotify.com/v1/users/${user_id}/playlists`, spotHeader)
        .then( d => {
            for(let i=0; i< d.data.items.length; i++){
                if(d.data.items[i].name === 'Transition')
                    goodPlay_id = d.data.items[i].id
                if(d.data.items[i].name === 'hype_1')
                    badPlay_id = d.data.items[i].id
            }
            // console.log("play id: ",goodPlay_id)
            // console.log("play id: ",badPlay_id)
        })

    //get user playlist goodSongs -> transition playlist song
    let nextURL_good = `https://api.spotify.com/v1/playlists/${goodPlay_id}/tracks`;
    do{
        await axios.get(nextURL_good, spotHeader)
            .then( d => {
                for(let i=0; i< d.data.items.length; i++){
                    goodSongs.push({
                        id: d.data.items[i].track.id,
                        start: [],
                        end: [],
                    });
                }
                nextURL_good = d.data.next;
                //100 songs returned limit
            })
    }while(nextURL_good)

    // get user playlist badSongs -> hype_1 playlist songs
    let nextURL_bad = `https://api.spotify.com/v1/playlists/${badPlay_id}/tracks`;
    do{
        await axios.get(nextURL_bad, spotHeader)
            .then( d => {
                for(let i=0; i< d.data.items.length; i++){
                    badSongs.push({
                        id: d.data.items[i].track.id,
                        start: [],
                        end: [],
                    });
                }
                nextURL_bad = d.data.next;
                //100 songs returned limit
            })
    }while(nextURL_bad)

    res.send().status(200);
});
let xs_raw, ys_raw;
app.get('/getSongAnalysis', async(req, res) => {
    //get good songs analysis
    let count_good = 0; ///TRANSITION playlist songs number: 204
    //GETS GOOD SONGS AND STORE A SONGS BEGINNING AND END IN SAME OBJ
    for(let i=0; i< goodSongs.length -0-0-0; i++){ ///long ass wait //change back to goodSongs.length!!!!!
        await axios.get('https://api.spotify.com/v1/audio-analysis/' + goodSongs[i].id, spotHeader)
            .then( res => {
                const seg_end = res.data.segments.length-1;
                const sec_end = res.data.sections.length-1;
                console.log('good: ',count_good++)

                goodSongs[i].start.push({
                    //section
                    section_duration: res.data.sections[0].duration,
                    section_loudness: res.data.sections[0].loudness,
                    section_tempo: res.data.sections[0].tempo,
                    section_key: res.data.sections[0].key,
                    section_mode: res.data.sections[0].mode,
                    section_time_sig: res.data.sections[0].time_signature,
                    //segments
                    segment_duration: res.data.segments[0].duration,
                    segment_pitches: res.data.segments[0].pitches,
                    segment_timbre: res.data.segments[0].timbre
                });
                goodSongs[i].end.push({
                    //section
                    section_duration: res.data.sections[sec_end].duration,
                    section_loudness: res.data.sections[sec_end].loudness,
                    section_tempo: res.data.sections[sec_end].tempo,
                    section_key: res.data.sections[sec_end].key,
                    section_mode: res.data.sections[sec_end].mode,
                    section_time_sig: res.data.sections[sec_end].time_signature,
                    //segments
                    segment_duration: res.data.segments[seg_end].duration,
                    segment_pitches: res.data.segments[seg_end].pitches,
                    segment_timbre: res.data.segments[seg_end].timbre
                });               
            })
    }

    //get bad songs analysis
    let count_bad = 0; ///HYPE_1 playlist songs number: 245
    //GETS BAD SONGS AND STORE A SONGS BEGINNING AND END IN SAME OBJ
    for(let i=0; i< badSongs.length-42-0-0; i++){ ///long ass wait //change back to goodSongs.length!!!!!
        await axios.get('https://api.spotify.com/v1/audio-analysis/' + badSongs[i].id, spotHeader)
            .then( res => {
                const seg_end = res.data.segments.length-1;
                const sec_end = res.data.sections.length-1;
                console.log('bad: ',count_bad++)

                badSongs[i].start.push({
                    //section
                    section_duration: res.data.sections[0].duration,
                    section_loudness: res.data.sections[0].loudness,
                    section_tempo: res.data.sections[0].tempo,
                    section_key: res.data.sections[0].key,
                    section_mode: res.data.sections[0].mode,
                    section_time_sig: res.data.sections[0].time_signature,
                    //segments
                    segment_duration: res.data.segments[0].duration,
                    segment_pitches: res.data.segments[0].pitches,
                    segment_timbre: res.data.segments[0].timbre
                });
                badSongs[i].end.push({
                    //section
                    section_duration: res.data.sections[sec_end].duration,
                    section_loudness: res.data.sections[sec_end].loudness,
                    section_tempo: res.data.sections[sec_end].tempo,
                    section_key: res.data.sections[sec_end].key,
                    section_mode: res.data.sections[sec_end].mode,
                    section_time_sig: res.data.sections[sec_end].time_signature,
                    //segments
                    segment_duration: res.data.segments[seg_end].duration,
                    segment_pitches: res.data.segments[seg_end].pitches,
                    segment_timbre: res.data.segments[seg_end].timbre
                });
                
            })
    }
    //SHIFT THE GOOD SONGS SO THAT END OF A SONG IS PAIRED WITH BEGINING OF NEXT SONG
    let count_sorted_good = 0; const sortedGood = []; const goodYS = [];
    for(let i=0; i< goodSongs.length-1-0; i++){ ///long ass wait //change back to goodSongs.length!!!!!
        console.log('sorted good: ', count_sorted_good++)

        //start of next song
        sortedGood.push([
            //start[0] section
            goodSongs[i+1].start[0].section_duration,
            goodSongs[i+1].start[0].section_loudness,
            goodSongs[i+1].start[0].section_tempo,
            goodSongs[i+1].start[0].section_key,
            goodSongs[i+1].start[0].section_mode,
            goodSongs[i+1].start[0].section_time_sig,
            //start[0] segments
            goodSongs[i+1].start[0].segment_duration,
            goodSongs[i+1].start[0].segment_pitches,
            goodSongs[i+1].start[0].segment_timbre,

            //end[0] section
            goodSongs[i].end[0].section_duration,
            goodSongs[i].end[0].section_loudness,
            goodSongs[i].end[0].section_tempo,
            goodSongs[i].end[0].section_key,
            goodSongs[i].end[0].section_mode,
            goodSongs[i].end[0].section_time_sig,
            //end[0] segments
            goodSongs[i].end[0].segment_duration,
            goodSongs[i].end[0].segment_pitches,
            goodSongs[i].end[0].segment_timbre,
        ]);
        goodYS.push([1]);
    }

    //SHIFT THE BAD SONGS SO THAT END OF A SONG IS PAIRED WITH BEGINING OF NEXT SONG
    let count_sorted_bad = 0; const sortedBad = []; const badYS = [];
    for(let i=0; i< badSongs.length-1-42-0; i++){ ///long ass wait //change back to badSongs.length!!!!!
        console.log('sorted bad: ', count_sorted_bad++)

        sortedBad.push([
        //start of next song
            //start[0] section
            badSongs[i+1].start[0].section_duration,
            badSongs[i+1].start[0].section_loudness,
            badSongs[i+1].start[0].section_tempo,
            badSongs[i+1].start[0].section_key,
            badSongs[i+1].start[0].section_mode,
            badSongs[i+1].start[0].section_time_sig,
            //start[0] segments
            badSongs[i+1].start[0].segment_duration,
            badSongs[i+1].start[0].segment_pitches,
            badSongs[i+1].start[0].segment_timbre,
        //end of current song
            //end[0] section
            badSongs[i].end[0].section_duration,
            badSongs[i].end[0].section_loudness,
            badSongs[i].end[0].section_tempo,
            badSongs[i].end[0].section_key,
            badSongs[i].end[0].section_mode,
            badSongs[i].end[0].section_time_sig,
            //end[0] segments
            badSongs[i].end[0].segment_duration,
            badSongs[i].end[0].segment_pitches,
            badSongs[i].end[0].segment_timbre,
        ]);
        badYS.push([0]);
    }

    // console.log('sort good songs: ', sortedGood)

    const allSongs = sortedGood.concat(sortedBad);
    const allOutputs = goodYS.concat(badYS);
    //
    // console.log('all songs: ', allSongs);
    // console.log('all outputs: ', allOutputs);

    xs_raw = allSongs; ys_raw = allOutputs;

    res.send().status(200);
});

let model;
app.get('/computeModel', async(req, res) => {  //CLEARIFY NORMALIZATION, WORRY ABOUT TIMBRE AND PITCH
    //input is two song => end of 1st song and beginning of next song
    //output is match precentage
    model = tf.sequential({
        layers: [
            //tf.layers.leakyReLU ({inputShape: [18]}), //initial layer to help with predictions zeroing out
            tf.layers.dense({units: 17, inputShape:[18], activation: 'relu'}), // first hidden layer
            tf.layers.dense({units: 15, activation: 'relu'}), // second hidden layer
            tf.layers.dense({units: 1, activation: 'relu', kernelRegularizer:tf.regularizers.l1l2()})  // output
        ]
    });

    model.compile({
        optimizer: tf.train.adam(),
        loss: tf.losses.huberLoss,
        // loss: 'binaryCrossentropy', // huberLoss(best) OR tf.losses.binaryCrossentropy (IDK why it sucks. prolly wrong use of it)
        metrics: ['acc']
    });

    // add sql input
    console.log('storing data');
    storeData();    
    console.log('done storing')
    // res.send().status(200)

    //retrieve data
    // await retrieveData();

    await trainModel();
    // await predictPlay()

    res.json(tModel).status(200);

})

function normalization(xs_raw_destruct, predict){
    // console.log(xs_raw_destruct);
    // return tf.tidy(() => {
        ////////////////////////////////////SPLIT GIVEN ARRAY INTO TENSORS////////////////////////////////////
        //start sections
        const start_section_duration = tf.tensor2d( xs_raw_destruct.map( d => d[0] ), [xs_raw_destruct.length, 1] )
        const start_section_loudness = tf.tensor2d( xs_raw_destruct.map( d => d[1] ), [xs_raw_destruct.length, 1] )
        const start_section_tempo = tf.tensor2d( xs_raw_destruct.map( d => d[2] ), [xs_raw_destruct.length, 1] )
        
                //these are already normalized when inintizalited
        const start_section_key = tf.tensor2d( xs_raw_destruct.map( d => d[3] ), [xs_raw_destruct.length, 1] ) 
        const start_section_mode = tf.tensor2d( xs_raw_destruct.map( d => d[4] ), [xs_raw_destruct.length, 1] )
        const start_section_time_sig = tf.tensor2d( xs_raw_destruct.map( d => d[5] ), [xs_raw_destruct.length, 1] )

        //start segments
        const start_segment_duration = tf.tensor2d( xs_raw_destruct.map( d => d[6] ), [xs_raw_destruct.length, 1] )
        const start_segment_pitches_avg = tf.tensor2d( xs_raw_destruct.map( (d) => d[7].reduce( (acc, curr) => acc+curr )/12) , [xs_raw_destruct.length, 1] )//avg of pitch
        const start_segment_timbre_avg = tf.tensor2d( xs_raw_destruct.map( d => d[8].reduce( (acc, curr) => curr+acc )/12) , [xs_raw_destruct.length, 1] )//avg of timbre needs max and min

        //end sections 
        const end_section_duration = tf.tensor2d( xs_raw_destruct.map( d => d[9] ), [xs_raw_destruct.length, 1] )
        const end_section_loudness = tf.tensor2d( xs_raw_destruct.map( d => d[10] ), [xs_raw_destruct.length, 1] )
        const end_section_tempo = tf.tensor2d( xs_raw_destruct.map( d => d[11] ), [xs_raw_destruct.length, 1] )

                //these are already normalized when inintizalited
        const end_section_key = tf.tensor2d( xs_raw_destruct.map( d => d[12] ), [xs_raw_destruct.length, 1] )
        const end_section_mode = tf.tensor2d( xs_raw_destruct.map( d => d[13] ), [xs_raw_destruct.length, 1] )
        const end_section_time_sig = tf.tensor2d( xs_raw_destruct.map( d => d[14] ), [xs_raw_destruct.length, 1] )

        //end segments
        const end_segment_duration = tf.tensor2d( xs_raw_destruct.map( d => d[15] ), [xs_raw_destruct.length, 1] )
        const end_segment_pitches_avg = tf.tensor2d( xs_raw_destruct.map( d => d[16].reduce( (acc, curr) => curr+acc )/12) , [xs_raw_destruct.length, 1]) //avg of pitch
        const end_segment_timbre_avg = tf.tensor2d( xs_raw_destruct.map( d => d[17].reduce( (acc, curr) => curr+acc )/12)  , [xs_raw_destruct.length, 1])//avg of timbre


        ////////////////////////////////////MIN MAX TENSORS////////////////////////////////////

        const n_s_sec_dur = start_section_duration.sub(start_section_duration.min()).div((start_section_duration.max()).sub(start_section_duration.min()) );
        const n_s_sec_loud = start_section_loudness.sub( start_section_loudness.min() ).div( (start_section_loudness.max()).sub(start_section_loudness.min()) );
        const n_s_sec_temp = start_section_tempo.sub( start_section_tempo.min() ).div( (start_section_tempo.max()).sub(start_section_tempo.min()) );
        
        const n_s_seg_dur = start_segment_duration.sub( start_segment_duration.min() ).div( (start_segment_duration.max()).sub(start_segment_duration.min()) );
        // const n_s_seg_pit = start_segment_pitches_avg.sub( start_segment_pitches_avg.min() ).div( (start_segment_pitches_avg.max()).sub(start_segment_pitches_avg.min()) );
        const n_s_seg_timb = start_segment_timbre_avg.sub( start_segment_timbre_avg.min() ).div( (start_segment_timbre_avg.max()).sub(start_segment_timbre_avg.min()) );
        
        let n_e_sec_dur, n_e_sec_loud, n_e_sec_temp, n_e_seg_dur, n_e_seg_timb;
        if(!predict){
            n_e_sec_dur = end_section_duration.sub( end_section_duration.min() ).div( (end_section_duration.max()).sub(end_section_duration.min()) );
            n_e_sec_loud = end_section_loudness.sub( end_section_loudness.min() ).div( (end_section_loudness.max()).sub(end_section_loudness.min()) );
            n_e_sec_temp = end_section_tempo.sub( end_section_tempo.min() ).div( (end_section_tempo.max()).sub(end_section_tempo.min()) );
            
            n_e_seg_dur = end_segment_duration.sub( end_segment_duration.min() ).div( (end_segment_duration.max()).sub(end_segment_duration.min()) );
            n_e_seg_timb = end_segment_timbre_avg.sub( end_segment_timbre_avg.min() ).div( (end_segment_timbre_avg.max()).sub(end_segment_timbre_avg.min()) );
        }else{
            n_e_sec_dur = end_section_duration.div( start_section_duration.max() ).div(end_section_duration.max());
            n_e_sec_loud = (end_section_loudness.div( start_section_loudness.max() ).div(end_section_loudness.max())).abs()
            n_e_sec_temp = end_section_tempo.div( start_section_tempo.max() ).div(end_section_tempo.max());
            
            n_e_seg_dur = end_segment_duration.sub( start_segment_duration.max() ).div(end_segment_duration.max());
            n_e_seg_timb = end_segment_timbre_avg.sub( start_segment_timbre_avg.max() ).div(end_segment_timbre_avg.max())
       
        }

        // console.log('end_section_duration: ')
        // end_section_duration.print();
        // n_e_sec_dur.print();

        // console.log('end_section_loudness: ')
        // end_section_loudness.print();
        // n_e_sec_loud.print();

        // console.log('end_section_tempo: ')
        // end_section_tempo.print();
        // n_e_sec_temp.print();

        ////////////////////////////////////RETURN NORMALIZED-CONCATED TENSOR////////////////////////////////////

        const axis = 1;
        const returnTen = tf.concat([
            //start section
            n_s_sec_dur, n_s_sec_loud, n_s_sec_temp,
            start_section_key, start_section_mode, start_section_time_sig,
            //start segment
            n_s_seg_dur, start_segment_pitches_avg, n_e_seg_timb,
            //end section
            n_e_sec_dur, n_e_sec_loud, n_e_sec_temp,
            end_section_key, end_section_mode, end_section_time_sig,
            //end segment
            n_e_seg_dur, end_segment_pitches_avg, n_e_seg_timb,
        ], axis)

        // if(!predict){ 
        //     tf.setBackend('tensorflow');
        //     console.log('doing good values shit')
        //     testerGoodValue = tf.slice(returnTen, [23, 0], [1]);
        //     testerBadValue = tf.slice(returnTen, [400, 0], [1]);
        // } 

        return returnTen;
}
app.get('/predictPlay', async(req, res) => {
    ///load model
    model = await tf.loadLayersModel('file://./transitionModel/model.json');
    model.summary();

    ///send predictions
    await predictPlay();
    console.log('kill me');
})
async function trainModel(){
    const xs_ten = normalization(xs_raw), ys_ten = tf.tensor2d(ys_raw);

    tModel = await model.fit(xs_ten, ys_ten, {
        shuffle: true,
        epochs: 1300,//1300
        validationSplit: .1,
        verbose: 2,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                console.log('epoch: ', epoch, ' logs: ', logs)
            }
        },
    })

    console.log('done training');
}
const newSongs = [];
async function predictPlay(){
    console.log('predicting...');

    ////////////////////////////////////////GET NEW SONG////////////////////////////////////////

    //get songs from liked songs pull id from somewhere in program
        //original song that is picked
    newSongs.push({id:'6LBpGdlukUARutol7VgWIS', start:[], end:[]});  // january 28th - jcole
        //songs that we will look to match with newSongs[0]
    newSongs.push({id:'1QpybTT7CadO6tsUBnoukv', start:[], end:[]}); // sky Resturant - hifi  (high match ~ .8-1)
    newSongs.push({id:'3eKVubySb5Se7k2evSoT32', start:[], end:[]}); // somebody - jid (low match ~ 0-.3)
    newSongs.push({id:'0JkryawvRTmBeA6cfzKumy', start:[], end:[]}); // 50//50 - vintage (low match ~ .3-.4)
    newSongs.push({id:'4kSYZCV2qlTpCPu0NnMoSR', start:[], end:[]}); // Bistro - MF DOOM (low match ~ 0-.4)

    // await new Promise(r => setTimeout(r, 8000));
    //get song analysis of songs in liked songs
    let count = 0; 
    for(let i=0; i< newSongs.length; i++){ ///newSongs should be run only this one time because model will be saved
        await axios.get('https://api.spotify.com/v1/audio-analysis/' + newSongs[i].id, spotHeader)
            .then( res => {
                const seg_end = res.data.segments.length-1;
                const sec_end = res.data.sections.length-1;
                console.log(count++)

                newSongs[i].start.push({
                    //section
                    section_duration: res.data.sections[0].duration,
                    section_loudness: res.data.sections[0].loudness,
                    section_tempo: res.data.sections[0].tempo,
                    section_key: res.data.sections[0].key,
                    section_mode: res.data.sections[0].mode,
                    section_time_sig: res.data.sections[0].time_signature,
                    //segments
                    segment_duration: res.data.segments[0].duration,
                    segment_pitches: res.data.segments[0].pitches,
                    segment_timbre: res.data.segments[0].timbre
                });
                newSongs[i].end.push({
                    //section
                    section_duration: res.data.sections[sec_end].duration,
                    section_loudness: res.data.sections[sec_end].loudness,
                    section_tempo: res.data.sections[sec_end].tempo,
                    section_key: res.data.sections[sec_end].key,
                    section_mode: res.data.sections[sec_end].mode,
                    section_time_sig: res.data.sections[sec_end].time_signature,
                    //segments
                    segment_duration: res.data.segments[seg_end].duration,
                    segment_pitches: res.data.segments[seg_end].pitches,
                    segment_timbre: res.data.segments[seg_end].timbre
                });               
            })
    }

    ////////////////////////////////////////NEW SONGS FORMATTING////////////////////////////////////////

    let xs_predict_raw = [];
    for(let i=1; i< newSongs.length; i++){//change back to newSongs.length-1!!!!
        xs_predict_raw.push([ 
        //start
            //sections 
            newSongs[i].start[0].section_duration,
            newSongs[i].start[0].section_loudness, 
            newSongs[i].start[0].section_tempo,
            (newSongs[i].start[0].section_key+1)/(11+1),
            (newSongs[i].start[0].section_mode+1)/(1+1),
            Math.abs((newSongs[i].start[0].section_time_sig-3)/(7-3)),
            //segments
            newSongs[i].start[0].segment_duration,
            newSongs[i].start[0].segment_pitches,
            newSongs[i].start[0].segment_timbre, 
        //end
            //sections 
            newSongs[0].end[0].section_duration,
            newSongs[0].end[0].section_loudness,
            newSongs[0].end[0].section_tempo,
            (newSongs[0].end[0].section_key+1)/(11+1),
            (newSongs[0].end[0].section_mode+1)/(1+1),
            (newSongs[0].end[0].section_time_sig-3)/(7-3),
            //segments
            newSongs[0].end[0].segment_duration,
            newSongs[0].end[0].segment_pitches,
            newSongs[0].end[0].segment_timbre, 
        ]);
    }

    // console.log(xs_predict_raw)

    const norm_xs = normalization(xs_predict_raw, true).arraySync();

    //turns raw into dataset
    const XS = tf.data.array(norm_xs).shuffle(seed=12);
    //turn dataset to tensor2d()
    const xs_predict_norm = tf.tensor2d(await XS.toArray());

    console.log('xs_predict_norm: ')
    xs_predict_norm.print();

    const newprediction = model.predict(xs_predict_norm)
    console.log('newValues pred: ')
    newprediction.print();


    console.log('done predicting')
}

async function storeData(){
    var con = mysql_noPromise.createConnection({
        host: "127.0.0.1",
        user: "root",
        password: "password",
        database: 'TrackData'
      });

    const data = normalization(xs_raw, false).arraySync();
    console.log(data, ' data being saved');

    con.query(
        'INSERT IGNORE INTO AnalizedSongs ( start_section_duration ,start_section_loudness ,start_section_tempo ,start_section_key ,start_section_mode ,start_section_time_sig ,start_segment_duration ,start_segment_pitches ,start_segment_timbre ,end_section_duration ,end_section_loudness ,end_section_tempo ,end_section_key ,end_section_mode ,end_section_time_sig ,end_segment_duration ,end_segment_pitches ,end_segment_timbre ) VALUES ?',
        [data], // '...VALUES ?' only works with con.query ??????
        (err) => {if(err) console.log(err);}
    )

    con.query(
        `SELECT * FROM AnalizedSongs`,
        (err, results) => { if(err) console.log(err); 
        console.log('TABLE INFO:  ', results);
        console.log('TABLE LENGTH:  ', results.length); }
    )
}

async function retrieveData(){
    const con = await mysql.createConnection({ host: "127.0.0.1", user: "root", password: "password", database: 'TrackData', Promise: bluebird})
    
    const [row1, fields1] = await con.execute( `SELECT * FROM AnalizedSongs WHERE id < 204`);
    for(let i=0; i< row1.length; i++){
        xs_raw.push([     
        //G_start
            //sections 
            row1[i].start_section_duration,
            row1[i].start_section_loudness, 
            row1[i].start_section_tempo,

            row1[i].start_section_key,
            row1[i].start_section_mode,
            row1[i].start_section_time_sig,
            //segments
            row1[i].start_segment_duration,
            row1[i].start_segment_pitches,
            row1[i].start_segment_timbre,
        //G_end
            //sections 
            row1[i].end_section_duration,
            row1[i].end_section_loudness, 
            row1[i].end_section_tempo,

            row1[i].end_section_key,
            row1[i].end_section_mode,
            row1[i].end_section_time_sig,
            //segments
            row1[i].end_segment_duration,
            row1[i].end_segment_pitches,
            row1[i].end_segment_timbre,
        ]);
        ys_raw.push([1]);
        console.log('bad songs: ', i);
    }

    const [row2, fields2] = await con.execute( `SELECT * FROM AnalizedSongs WHERE id > 204`);

    for(let i=0; i< row2.length; i++){
        xs_raw.push([     
        //G_start
            //sections 
            row2[i].start_section_duration,
            row2[i].start_section_loudness, 
            row2[i].start_section_tempo,

            row2[i].start_section_key,
            row2[i].start_section_mode,
            row2[i].start_section_time_sig,
            //segments
            row2[i].start_segment_duration,
            row2[i].start_segment_pitches,
            row2[i].start_segment_timbre,
        //G_end
            //sections 
            row2[i].end_section_duration,
            row2[i].end_section_loudness, 
            row2[i].end_section_tempo,

            row2[i].end_section_key,
            row2[i].end_section_mode,
            row2[i].end_section_time_sig,
            //segments
            row2[i].end_segment_duration,
            row2[i].end_segment_pitches,
            row2[i].end_segment_timbre,
        ]);
        ys_raw.push([0]);
        console.log('bad songs: ', i);
    }
    console.log('FULL TABLE LENGTH:  ', row1.length + row2.length); 
                
    // console.log('XS: ', xs_raw)
    // console.log('YS: ', ys_raw)

    await con.end();
}