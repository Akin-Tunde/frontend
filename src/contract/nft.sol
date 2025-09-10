// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ReceiptNFT is ERC721, Ownable {
    private uint256 _nextTokenId;

    // The name and symbol for your NFT collection
    constructor() ERC721("SpotifyReceipt", "RCPT") {}

    // The main function your frontend will call
    // It takes the user's address and the IPFS link to the metadata (tokenURI)
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
}
