// SPDX-License-Identifier: MIT
// Specifies the license for the code, a standard practice.
pragma solidity ^0.8.20;

// Imports code from the trusted OpenZeppelin library. This is the best practice for security.
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReceiptNFT
 * @dev This contract allows users to mint their Spotify receipts as unique NFTs.
 * It uses the ERC721 standard for compatibility with all NFT marketplaces.
 */
contract ReceiptNFT is ERC721, ERC721URIStorage, Ownable {
    // A counter to ensure every NFT has a unique ID.
    private uint256 _nextTokenId;

    /**
     * @dev The constructor is run only once when the contract is deployed.
     * It sets the name and symbol for the entire NFT collection.
     * e.g., On OpenSea, it will be called "Spotify Receipt" with the symbol "RCPT".
     * It also sets the deployer of the contract as the owner.
     */
    constructor() ERC721("Spotify Receipt", "RCPT") Ownable(msg.sender) {}

    /**
     * @dev This is the main function your frontend will call to create the NFT.
     * It is public, so anyone can call it to mint their own receipt.
     * @param uri The IPFS link to the metadata JSON file for this NFT.
     */
    function safeMint(string memory uri) public {
        // Assign the next available token ID to the new NFT.
        uint256 tokenId = _nextTokenId++;

        // Mint the new NFT and assign it to the person who called the function (msg.sender).
        _safeMint(msg.sender, tokenId);

        // Set the metadata link (tokenURI) for the newly created NFT.
        _setTokenURI(tokenId, uri);
    }

    // The following functions are required by Solidity because we are inheriting from multiple contracts
    // that both define these functions. We are simply telling the compiler to use the standard behavior.

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
