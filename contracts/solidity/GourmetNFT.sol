// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ERC721.sol";
import "./Pausable.sol";
import "./Ownable.sol";
import "./ERC721Burnable.sol";
import "./Counters.sol";

contract GourmetNFT is ERC721, Pausable, Ownable, ERC721Burnable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    event BatchIdTokenId(string indexed batchId, uint256 tokenId);

    constructor() ERC721("GourmetNFT", "GOURMET") {}

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
    
    function safeMint(address to) public onlyOwner whenNotPaused {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }

    function setTokenTransactionHash(uint256 tokenId, string memory batchId, string memory transactionHash) public onlyOwner whenNotPaused{
        _setTokenTxHash(tokenId, transactionHash);
        emit BatchIdTokenId(batchId, tokenId);
    }


    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchsize)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, tokenId, batchsize);
    }
}
