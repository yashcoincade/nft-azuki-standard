// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @notice Error Codes
 */
error MyNFT__PublicSaleNotActive();
error MyNFT__WhiteListSaleNotActive();
error MyNFT__ExceedsMaxSupply();
error MyNFT__ExceedsMaxNFTsPerWallet();
error MyNFT__ExceedsMaxWhiteListNFTsPerWallet();
error MyNFT__InsufficientFunds();

/** @title NFT Contract for MyNFT
 * @author Yash Khanvilkar
 * @notice This contract is an ERC721A NFT Contract for optimized mints
 */
contract MyNFT is ERC721A, Ownable {
    using Strings for uint256;

    //State Variables to be changed
    uint256 public constant MAX_SUPPLY = 100;
    uint256 public constant MAX_PUBLIC_MINT = 10;
    uint256 public constant MAX_WHITELIST_MINT = 3;
    uint256 public constant PUBLIC_SALE_PRICE = 0.02 ether;
    uint256 public constant WHITELIST_SALE_PRICE = 0.01 ether;
    uint256 public constant teamMintQuantity = 10;

    string public baseTokenUri;
    string public placeholderTokenUri;

    //Toggle Switches
    bool public isRevealed;
    bool public publicSale;
    bool public whiteListSale;
    bool public pause;
    bool public teamMinted;

    bytes32 private merkleRoot;

    mapping(address => uint256) public totalPublicMint;
    mapping(address => uint256) public totalWhitelistMint;

    constructor() ERC721A("MyNFT", "MNT") {}

    modifier callerIsUser() {
        require(tx.origin == msg.sender, "Cannot be called by a contract");
        _;
    }

    /**
     * @notice This function is for public mint of MyNFT
     * @param _quantity: no. of NFTs to be minted
     */
    function mint(uint256 _quantity) external payable callerIsUser {
        if (!publicSale) {
            revert MyNFT__PublicSaleNotActive();
        }
        if ((totalSupply() + _quantity) > MAX_SUPPLY) {
            revert MyNFT__ExceedsMaxSupply();
        }
        if ((totalPublicMint[msg.sender] + _quantity) > MAX_PUBLIC_MINT) {
            revert MyNFT__ExceedsMaxNFTsPerWallet();
        }
        if (msg.value < (PUBLIC_SALE_PRICE * _quantity)) {
            revert MyNFT__InsufficientFunds();
        }

        totalPublicMint[msg.sender] += _quantity;
        _safeMint(msg.sender, _quantity);
    }

    /**
     * @notice This function is for whitelist mint of MyNFT
     * @param _quantity: no. of NFTs to be minted
     * @param _merkleProof: Proof for proving whitlelist status
     */
    function whitelistMint(
        bytes32[] memory _merkleProof,
        uint256 _quantity
    ) external payable callerIsUser {
        if (!whiteListSale) {
            revert MyNFT__WhiteListSaleNotActive();
        }
        if ((totalSupply() + _quantity) > MAX_SUPPLY) {
            revert MyNFT__ExceedsMaxSupply();
        }
        if ((totalWhitelistMint[msg.sender] + _quantity) > MAX_WHITELIST_MINT) {
            revert MyNFT__ExceedsMaxWhiteListNFTsPerWallet();
        }
        if (msg.value < (WHITELIST_SALE_PRICE * _quantity)) {
            revert MyNFT__InsufficientFunds();
        }

        //create leaf node
        bytes32 sender = keccak256(abi.encodePacked(msg.sender));

        require(
            MerkleProof.verify(_merkleProof, merkleRoot, sender),
            "You are not whitelisted"
        );

        totalWhitelistMint[msg.sender] += _quantity;
        _safeMint(msg.sender, _quantity);
    }

    /**
     * @notice This function can be called only once by the deployer for minting NFTs for the Team
     */
    function teamMint() external onlyOwner {
        require(!teamMinted, "Team already minted");
        teamMinted = true;
        _safeMint(msg.sender, teamMintQuantity);
    }

    /**
     * @notice This function withdraws smart contract balance to the owner of the contract
     */
    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}(
            ""
        );
        require(success, "Withdrawing Failed!");
    }

    function setTokenUri(string memory _baseTokenUri) external onlyOwner {
        baseTokenUri = _baseTokenUri;
    }

    function setPlaceHolderUri(
        string memory _placeholderTokenUri
    ) external onlyOwner {
        placeholderTokenUri = _placeholderTokenUri;
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    /**
     * @notice This function returns baseURI
     * @return baseTokenUri
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenUri;
    }

    /**
     * @notice This function returns tokenURI of a specific tokenID
     * @param tokenId: tokenId of NFT you want to query the URI for
     * @return URI for mentioned tokenId
     */
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        uint256 trueId = tokenId + 1;

        if (!isRevealed) {
            return placeholderTokenUri;
        }
        //string memory baseURI = _baseURI();
        return
            bytes(baseTokenUri).length > 0
                ? string(
                    abi.encodePacked(baseTokenUri, trueId.toString(), ".json")
                )
                : "";
    }

    /**
     * @notice This function returns Merkleroot\
     * @return Merkle Root
     */
    function getMerkleRoot() external view returns (bytes32) {
        return merkleRoot;
    }

    /**
     * @notice Toggle Switch for pause
     */

    function togglePause() external onlyOwner {
        pause = !pause;
    }

    /**
     * @notice Toggle Switch for whitelist
     */
    function toggleWhiteListSale() external onlyOwner {
        whiteListSale = !whiteListSale;
    }

    /**
     * @notice Toggle Switch for public sale
     */
    function togglePublicSale() external onlyOwner {
        publicSale = !publicSale;
    }

    /**
     * @notice Toggle Switch for reveal
     */
    function toggleReveal() external onlyOwner {
        isRevealed = !isRevealed;
    }
}
