const { calculateFee, GasPrice } = require("@cosmjs/stargate");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningCosmWasmClient, CosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const _ = require("fs");

const rpcEndpoint = "https://rpc.cliffnet.cosmwasm.com:443";

// Example user from scripts/wasmd/README.md
const sender = {
    mnemonic: "rare race capable trend seven pilot silent couple battle zone camera clarify laundry fix ship citizen good crater ribbon cloud journey paddle bulk much",
    address: "wasm1mgl5svtz8sy3s6aavx9589txu789djd0ewsqdl",
};

const recipient = {
    mnemonic: "target below announce scorpion six broccoli viable tail dance leave cradle young rescue brick merry mean duty because clog hat shop hub that enter",
    address: "wasm1km7eq7csp9my73994c5c8m5hec4wkl9mnsyf0q",
};

const arbiter = {
    mnemonic: "oblige apple beef tomato husband bacon nothing monster tell phone able grunt purchase manage exotic scrap fish plunge zone rose device dove bid bar",
    address: "wasm12z2lfyv4297tzs0ck3taswfesx86x78rypm30l",
};

async function main() {
    // const escrowWasmPath =  "./cw_escrow.wasm";
    const gasPrice = GasPrice.fromString("0.05upebble");

    // Upload contract
    const sender_wallet = await DirectSecp256k1HdWallet.fromMnemonic(sender.mnemonic, { prefix: "wasm" });
    const sender_client = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, sender_wallet);
    const wasm = _.readFileSync(escrowWasmPath);
    const uploadFee = calculateFee(1_500_000, gasPrice);
    const uploadReceipt = await sender_client.upload(sender.address, wasm, uploadFee, "Upload hackatom contract");
    console.log("Upload succeeded. Receipt:", uploadReceipt);

    // Instantiate
    const instantiateFee = calculateFee(500_000, gasPrice);
	const msg = {} ;
    const { contractAddress } = await sender_client.instantiate(
        sender.address,
        uploadReceipt.codeId,
        msg,
        "My instance",
        instantiateFee,
        { memo: `Create a hackatom instance` },
    );
    console.info(`Contract instantiated at: `, contractAddress);

    // const contractAddress = "wasm16g5nklyw9ztcmkpnx0qxara0md6xqdkv7ck2cm339fwcanv87fcq7t27td";
    // Create escrow contract
    const executeFee = calculateFee(300_000, gasPrice);
    const escrow_id = "random";
    const create_result = await sender_client.execute(
        sender.address, 
        contractAddress,  
        {
            create: {
                arbiter: arbiter.address, 
                recipient: recipient.address, 
                id: escrow_id,
            }
        }, 
        executeFee,
        "",
        [{denom: "upebble", amount: "10000"}]
    );

    console.info("escrow create execution result: ", create_result);

    // Approve
    const arbiter_wallet = await DirectSecp256k1HdWallet.fromMnemonic(arbiter.mnemonic, { prefix: "wasm" });
    const arbiter_client = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, arbiter_wallet);
    const approve_result = await arbiter_client.execute(
        arbiter.address, 
        contractAddress,  
        {
            approve: {
                id: escrow_id,
            }
        }, 
        executeFee,
    );
    console.info("escrow approve result: ", approve_result);

    // escrow with cw20
    const escrow_id1 = "random1";
    const create_msg = {            
        create: {
            arbiter: arbiter.address, 
            recipient: recipient.address, 
            id: escrow_id1,
        }
    };
    const create_result1 = await sender_client.execute(
        sender.address,  // token address
        contractAddress,  
        {
            receive: {
                amount: "10_000_000", 
                msg: Buffer.from(create_msg, 'base64'),
                sender: sender.address,
            }
        }, 
        executeFee,
    );

    console.info("escrow create execution result: ", create_result1);

	// query
	const client = await CosmWasmClient.connect(rpcEndpoint);
	const query_result = await client.queryContractSmart(contractAddress, {details:{id: "random"}});
	console.info("query result", query_result);
}

main();