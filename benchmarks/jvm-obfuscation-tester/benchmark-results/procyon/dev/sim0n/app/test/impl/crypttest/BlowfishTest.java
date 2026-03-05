package dev.sim0n.app.test.impl.crypttest;

import dev.sim0n.app.test.Test;

public class BlowfishTest implements Test {
  @Override
  public void run() {
    System.out.println("Testing blowfish");
    final Blowfish blowfish = new Blowfish("jHASf72183hjASf123");
    final String encryptedString =
        "5f45e43ca774e1d2611c6fc31c7e4b11ef4780e0ba9ba304b9da8b28bc86582e6745624bb00bfbc7a71f97a1e708e13bcfd6f700d77216680a52dc1d16e3a9dc2747a26466eb273d";
    final String decryptedString = blowfish.decryptString(encryptedString);
    final String test =
        "5f45e43ca774e1d2611c6fc31c7e4b11ef4780e0ba9ba304b9da8b28bc86582e6745624bb00bfbc7a71f97a1e708e13bcfd6f700d77216680a52dc1d16e3a9dc2747a26466eb273d5f45e43ca774e1d2611c6fc31c7e4b11ef4780e0ba9ba304b9da8b28bc86582e6745624bb00bfbc7a71f97a1e708e13bcfd6f700d77216680a52dc1d16e3a9dc2747a26466eb273d";
    final boolean successfulStringCompare = test.equals(encryptedString + encryptedString);
    if (!successfulStringCompare) {
      throw new IllegalStateException("String comparison failed");
    }
    final boolean successfulDecrypt = decryptedString.equals("hello world 123 1605479835458");
    if (!successfulDecrypt) {
      throw new IllegalStateException("String decryption failed");
    }
    System.out.println("Successfully tested blowfish");
  }
}
