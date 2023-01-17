const { MerkleTree } = require("merkletreejs")
const keccak256 = require("keccak256")

const addresses = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x8D8F7397258DdbcEf53DbE9b5e5cF73c684187e2",
    "0xE4C0423981B6bFA27fa2874a00084FC94ae0ED80",
    "0xb9297a861040026b7a488238A26ee13e1056b6B1",
]

const leaves = addresses.map((x) => keccak256(x))
const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
const buff2hex = (x) => "0x" + x.toString("hex")
const merkleRoot = buff2hex(tree.getRoot())
console.log("MerkleRoot is: ", merkleRoot)

module.exports = { addresses }

//For Front end to get proof
// const proof = tree.getProof(senderAddress)
