// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface INonStandardERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256 balance);

    /// !!! NOTICE !!! transfer does not return a value, in violation of the ERC-20 specification
    function transfer(address dst, uint256 amount) external;

    /// !!! NOTICE !!! transferFrom does not return a value, in violation of the ERC-20 specification
    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external;

    function approve(address spender, uint256 amount)
        external
        returns (bool success);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256 remaining);

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 amount
    );
}

interface IERC721 {
    function mint(address _receiver) external;

    function bulkMint(address _receiver,uint256 _quantity) external;

    function balanceOf(address _owner) external view returns (uint256 balance);
}

contract NFTSale is ReentrancyGuard, Ownable, Pausable {
    bool public iswhitelist;
    uint256 public CENTS = 10**4;
    uint256 public userMaxAllowance;
    uint256 public hardcap;
    uint256 public priceInUSD;
    address public nftAddress;
    address public TREASURY = msg.sender; //replace in prod
    address public USDT;
    bytes32 public root;
    mapping (address => uint256) public purchasedCount;
    constructor(
        // uint256 _priceInWei,
        uint256 _hardcap,
        uint256 _userMaxAllowance,
        uint256 _priceInUSD,
        address _nftAddress,
        address _usdtAddress,
        bytes32 _root
    ) {
        // priceInETH = _priceInWei;
        hardcap = _hardcap;
        userMaxAllowance = _userMaxAllowance;
        priceInUSD = _priceInUSD * CENTS;
        nftAddress = _nftAddress;
        USDT = _usdtAddress;
        root = _root;
    }

    modifier isWhitelisted(bytes32[] memory proof) {
        if (iswhitelist) {
            require(
                isValid(proof, keccak256(abi.encodePacked(msg.sender))),
                "Unauthorized"
            );
        }
        _;
    }

    function isValid(bytes32[] memory proof, bytes32 leaf)
        public
        view
        returns (bool)
    {
        return MerkleProof.verify(proof, root, leaf);
    }

    function setTreasury(address _treasury) external onlyOwner {
        TREASURY = _treasury;
    }

    //Only Testing
    function setMerkleRoot(bytes32 _root) external onlyOwner {
        root = _root;
    }

    // function setPriceETH(uint256 _priceInWei) public onlyOwner {
    //     priceInETH = _priceInWei;
    // }

    function setPriceUSD(uint256 _priceInUSD) public onlyOwner {
        priceInUSD = _priceInUSD * CENTS;
    }

    function setWhitelist(bool _status) external onlyOwner {
        iswhitelist = _status;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function setUserAllowance(uint256 _userMaxAllowance) public onlyOwner{
        userMaxAllowance = _userMaxAllowance;
    }

    function setHardcap(uint256 _hardcap) public {
        hardcap = _hardcap;
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function totalMinted() public view  returns (uint256)
    {
      return (INonStandardERC20(USDT).balanceOf(address(this)) / (priceInUSD * 10**6 / CENTS));
    }


    function buyNFTWithToken( bytes32[] memory proof ,uint256 quantity)
        external
        whenNotPaused
        nonReentrant
        isWhitelisted(proof)
    {
        uint256 amount = (priceInUSD * 10**6) / CENTS;        
        require((((amount * quantity) + INonStandardERC20(USDT).balanceOf(address(this))) / amount ) <= hardcap ,"Exceed hardcap amount");
        require(( purchasedCount[msg.sender]) + quantity  <= userMaxAllowance,"Exceed allowance");
        purchasedCount[msg.sender] = quantity;
        _transferTokensIn(USDT, msg.sender, amount * quantity);
        IERC721(nftAddress).bulkMint(msg.sender,quantity);
    }

    function _transferTokensIn(
        address tokenAddress,
        address from,
        uint256 amount
    ) private {
        if (USDT == tokenAddress) {
            INonStandardERC20 _token = INonStandardERC20(tokenAddress);
            _token.transferFrom(from, address(this), amount);
            bool success;
            assembly {
                switch returndatasize()
                case 0 {
                    // This is a non-standard ERC-20
                    success := not(0) // set success to true
                }
                case 32 {
                    // This is a compliant ERC-20
                    returndatacopy(0, 0, 32)
                    success := mload(0) // Set success = returndata of external call
                }
                default {
                    // This is an excessively non-compliant ERC-20, revert.
                    revert(0, 0)
                }
            }
            require(success, "Transfer failed");
        } 
    }

    function _transferTokensOut(
        address tokenAddress,
        address to,
        uint256 amount
    ) private {
        if (USDT == tokenAddress) {
            INonStandardERC20 _token = INonStandardERC20(tokenAddress);
            _token.transfer(to, amount);
            bool success;
            assembly {
                switch returndatasize()
                case 0 {
                    // This is a non-standard ERC-20
                    success := not(0) // set success to true
                }
                case 32 {
                    // This is a compliant ERC-20
                    returndatacopy(0, 0, 32)
                    success := mload(0) // Set success = returndata of external call
                }
                default {
                    // This is an excessively non-compliant ERC-20, revert.
                    revert(0, 0)
                }
            }
            require(success, "Transfer failed");
        } 
    }

    // function buyNFTWithETH(bytes32[] memory proof)
    //     external
    //     payable
    //     whenNotPaused
    //     nonReentrant
    //     isWhitelisted(proof)
    // {
    //     require(msg.value >= priceInETH, "Incorrect amount");
    //     IERC721(nftAddress).mint(msg.sender);
    // }

    function withdrawTokens(uint256 _amount)
        external
        onlyOwner
        nonReentrant
        whenPaused
    {
        _transferTokensOut(USDT, TREASURY, _amount);
    }

    // function withdrawETH() external onlyOwner nonReentrant whenPaused {
    //     require(address(this).balance > 0, "Insufficient Balance");
    //     payable(TREASURY).transfer(address(this).balance);
    // }

    // receive() external payable {}
}