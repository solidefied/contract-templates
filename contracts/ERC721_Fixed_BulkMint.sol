// SPDX-License-Identifier: MIT
// Fixed supply ,Common uri
pragma solidity ^0.8.16;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ERC721_Fixed_BulkMint is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    using Counters for Counters.Counter;
    using Strings for uint256;
    Counters.Counter private _tokenIdCounter;

    uint public TOKEN_SUPPLY;
    address TREASURY;
    string public baseURI;

    constructor(
        address treasury,
        string memory _baseUri,
        uint256 _tokenSupply,
        string memory _collectionName,
        string memory _collectionSymbol
    ) ERC721(_collectionName, _collectionSymbol) {
        TREASURY = treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        TOKEN_SUPPLY = _tokenSupply;
        baseURI = _baseUri;
    }

    function bulkMint(address[] memory to, uint256[] memory _quantity)
        external
        onlyRole(MINTER_ROLE)
    {
        require(_quantity.length == to.length, "Invalid Data");
        for (uint i = 0; i < to.length; i++) {
            require(to[i] != address(0), "Invalid Address");
            for (uint j = 0; j < _quantity[i]; j++) {
                uint256 tokenId = _tokenIdCounter.current();
                require(tokenId < TOKEN_SUPPLY, "Limit Reached");
                _tokenIdCounter.increment();
                _safeMint(to[i], tokenId);
            }
        }
    }

    function mintToken(address to) external onlyRole(MINTER_ROLE) {
        uint256 tokenId = _tokenIdCounter.current();
        require(to != address(0), "Invalid Address");
        require(tokenId < TOKEN_SUPPLY, "Limit Reached");
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
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
        require(_exists(_tokenId), "Invalid TokenId");

        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, _tokenId.toString()))
                : "";
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
