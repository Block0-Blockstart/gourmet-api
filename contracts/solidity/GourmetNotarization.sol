// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './Pausable.sol';
import './Ownable.sol';

contract GourmetNotarization is Pausable, Ownable {
  struct File {
    string name;
    string hash;
  }

  struct Link {
    string name;
    string url;
  }

  struct Field {
    string name;
    string hash;
  }

  struct Data {
    string id;
    File[] files;
    Link[] links;
    Field[] fields;
  }

  address nftContract;

  event NotarizeData(Data data);

  function notarizeData(Data memory data_) public onlyOwner whenNotPaused {
    emit NotarizeData(data_);
  }

  function pause() public onlyOwner {
    _pause();
  }

  function unpause() public onlyOwner {
    _unpause();
  }
}
