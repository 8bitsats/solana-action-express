'use strict';
// *********************************************************************************
// usdc donation action
import {rpc,host} from '../config.js';
import {Connection,PublicKey} from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import mcswap from 'mcswap-js';
import Express from 'express';
const mcsend = Express.Router();
// *********************************************************************************

// *********************************************************************************
async function McSendBundle(rpcurl,account,amount,wallets){ 
    wallets = wallets.replace(/(?:\r\n|\r|\n)/g,'');
    console.log("rpcurl", rpcurl);
    wallets=wallets.split(",");
    let bundle = [];
    for(let i=0;i<wallets.length;i++){
        const recipient = wallets[i].trim();
        const SOLANA_CONNECTION = new Connection(rpcurl,"confirmed");
        const MINT_ADDRESS = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        const DECIMALS = 6;
        const TO_WALLET = new PublicKey(recipient);
        const FROM_WALLET = new PublicKey(account);
        const AMOUNT = parseFloat(amount);
        const AMT = AMOUNT.toFixed(DECIMALS);
        const TRANSFER_AMOUNT = parseInt(AMT*Math.pow(10,DECIMALS));
        console.log("FROM_WALLET", FROM_WALLET.toString());
        console.log("TO_WALLET", TO_WALLET.toString());
        console.log("TRANSFER_AMOUNT", TRANSFER_AMOUNT);
        const fromTokenAccount = await splToken.getAssociatedTokenAddress(MINT_ADDRESS,FROM_WALLET,false,splToken.TOKEN_PROGRAM_ID,splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        console.log("fromTokenAccount", fromTokenAccount.toString());
        let oncurve = true;
        if(PublicKey.isOnCurve(TO_WALLET.toString())){oncurve=false;}
        const toTokenAccount = await splToken.getAssociatedTokenAddress(MINT_ADDRESS,TO_WALLET,oncurve,splToken.TOKEN_PROGRAM_ID,splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
        console.log("toTokenAccount", toTokenAccount.toString());
        let createATA = false;
        await splToken.getAccount(SOLANA_CONNECTION,toTokenAccount,'confirmed',splToken.TOKEN_PROGRAM_ID).then(function(response){createATA=false;})
        .catch(function(error){if(error.name=="TokenAccountNotFoundError"){createATA=true}});
        if(createATA===true){
            console.log("creating recipient ata");
            const createATAiX = new splToken.createAssociatedTokenAccountInstruction(FROM_WALLET,toTokenAccount,TO_WALLET,MINT_ADDRESS,splToken.TOKEN_PROGRAM_ID,splToken.ASSOCIATED_TOKEN_PROGRAM_ID);
            bundle.push(createATAiX);
        }
        else{
            console.log("not creating recipient ata");
        }
        const transferInstruction = splToken.createTransferInstruction(fromTokenAccount,toTokenAccount,FROM_WALLET,TRANSFER_AMOUNT);
        bundle.push(transferInstruction);
        console.log("ixs count ", bundle.length);
        if(i==(wallets.length-1)){
            return bundle;
        }
    }    
}
// *********************************************************************************

// *********************************************************************************
// usdc donation config
mcsend.get('/mcsend',(req,res)=>{
    const form = [
        {
            "name": "amount",
            "label": "USDC Amount",
            "type": "number",
            "required": true
        },
        {
            "name": "wallets",
            "type": "textarea",
            "label": "CSV Wallet List",
            "required": true
        },
        {
            "name": "priority",
            "type": "select",
            "label": "CSV Wallet List",
            "required": true,
            "options": [
                {"label":"Very High","value":"Very High","selected":false},
                {"label":"High","value":"High","selected":false},
                {"label":"Medium","value":"Medium","selected":true},
                {"label":"Low","value":"Low","selected":false},                
                {"label":"Min","value":"Min","selected":false}              
            ]
        }
    ];
    const obj = {}
    obj.icon = "https://airadlabs.com/images/drops/0.jpg";
    obj.title = "McSend USDC";
    obj.description = "Sends USDC to multiple wallets. Enter USDC amount to send to each wallet and enter a comma seperated list of wallets.";
    obj.label = "mcsend";
    obj.links = {"actions":[{"label":"Send","href":host+"/mcsend-build","parameters":form}]};
    res.json(obj);
});
// *********************************************************************************

// *********************************************************************************
// usdc donation tx 
mcsend.route('/mcsend-build').post(async(req,res)=>{
try{if(typeof req.body.account=="undefined"||req.body.account.includes("1111111111111111111111")){res.json(await mcswap.dummy(rpc));}
else{
    const body = req.body.data;
    const instructions = await McSendBundle(rpc,req.body.account,body.amount,body.wallets);
    const _tx_ = {};
    _tx_.rpc = rpc;                     // string : required
    _tx_.account = req.body.account;    // string : required
    _tx_.instructions = instructions;   // array  : required
    _tx_.signers = false;               // array  : default false
    _tx_.serialize = true;              // bool   : default false
    _tx_.encode = true;                 // bool   : default false
    _tx_.table = false;                 // array  : default false
    _tx_.tolerance = 1.2;               // int    : default 1.1    
    _tx_.compute = false;               // bool   : default true
    _tx_.fees = false;                  // bool   : default true : helius rpc required when true
    _tx_.priority = body.priority;      // string : VeryHigh,High,Medium,Low,Min : default Medium
    const tx = await mcswap.tx(_tx_);   // package the tx
    console.log(tx);
    res.json(tx);
}}
catch(err){
    const _err_ = {};
    _err_.status="error";
    _err_.message="error";
    _err_.err=err;
    res.status(400).json(_err_);
}
});
export {mcsend};
// *********************************************************************************