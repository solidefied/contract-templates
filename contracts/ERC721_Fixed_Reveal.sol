// SPDX-License-Identifier: MIT
// Fixed supply ,Separate uri
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ERC721Collection_1 is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    using Counters for Counters.Counter;
    using Strings for uint256;
    Counters.Counter private _tokenIdCounter;

    address TREASURY;
    string public baseURI;
    bool public revealed;
    uint public TOKEN_SUPPLY;
    mapping(uint256 => string) private _tokenURI;

    constructor(
        address treasury,
        string memory _baseUri,
        uint256 _tokenSupply,
        string memory _collectionName,
        string memory _collectionSymbol
    ) ERC721(_collectionName, _collectionSymbol) {
        TREASURY = treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        TOKEN_SUPPLY = _tokenSupply;
        baseURI = _baseUri;
    }

    function mintToken(address to, string memory _uri)
        external
        onlyRole(MINTER_ROLE)
    {
        uint256 tokenId = _tokenIdCounter.current();
        require(tokenId < TOKEN_SUPPLY, "Limit Reached");
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _tokenURI[tokenId] = _uri;
    }

    // to set or update total token supply
    function setTokenSupply(uint256 _tokenSupply)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        TOKEN_SUPPLY = _tokenSupply;
    }

    // to set or update the baseUri.
    function setBaseURI(string memory _uri)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        baseURI = _uri;
    }

    function setReveal(bool _revealed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(revealed != _revealed, "setReveal: Value should not be same");
        revealed = _revealed;
    }

    function setTreasury(address treasury)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        TREASURY = treasury;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function setMinterRole(address _minter)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _grantRole(MINTER_ROLE, _minter);
    }

    function setTokenURI(uint _tokenId, string memory _uri)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            _exists(_tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        _tokenURI[_tokenId] = _uri;
    }

    //to withdraw native currency(if any)
    function withdrawAccidentalETH()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (bool)
    {
        (bool success, ) = TREASURY.call{value: getBalance()}("");
        return success;
    }

    function withdrawAccidentalToken(address _erc20Token)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // In case of Non standard ERC20 tokens change this function
        require(IERC20(_erc20Token).balanceOf(address(this)) > 0, "!BALANCE");
        IERC20(_erc20Token).transfer(
            TREASURY,
            IERC20(_erc20Token).balanceOf(address(this))
        );
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    // Every marketplace looks for this function to read the uri of a token
    function tokenURI(uint256 _tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(_tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        string memory notRevealedUri = _baseURI();
        if (!revealed) return notRevealedUri;
        string memory token_URI = _tokenURI[_tokenId];
        return bytes(token_URI).length > 0 ? token_URI : "";
    }

    //total token minted
    function tokenMinted() public view returns (uint) {
        return _tokenIdCounter.current();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
