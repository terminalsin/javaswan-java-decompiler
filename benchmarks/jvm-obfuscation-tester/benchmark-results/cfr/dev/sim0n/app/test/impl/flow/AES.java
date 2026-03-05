package dev.sim0n.app.test.impl.flow;

import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.KeyGenerator;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;

public class AES {
  private static final char[] HEX_ARRAY = "0123456789ABCDEF".toCharArray();

  public static void main(String[] args)
      throws NoSuchAlgorithmException, NoSuchPaddingException, IllegalBlockSizeException,
          BadPaddingException, InvalidKeyException {
    String plainText = "Hello World";
    SecretKey secKey = AES.getSecretEncryptionKey();
    byte[] cipherText = AES.encryptText(plainText, secKey);
    String decryptedText = AES.decryptText(cipherText, secKey);
    System.out.println("Original Text: " + plainText);
    System.out.println("AES Key (Hex Form): " + AES.bytesToHex(secKey.getEncoded()));
    System.out.println("Encrypted Text (Hex Form): " + AES.bytesToHex(cipherText));
    System.out.println("Decrypted Text: " + decryptedText);
  }

  public static SecretKey getSecretEncryptionKey() throws NoSuchAlgorithmException {
    KeyGenerator aesKeyGenerator = KeyGenerator.getInstance("AES");
    aesKeyGenerator.init(128);
    return aesKeyGenerator.generateKey();
  }

  public static byte[] encryptText(String plainText, SecretKey secKey)
      throws NoSuchAlgorithmException, NoSuchPaddingException, InvalidKeyException,
          IllegalBlockSizeException, BadPaddingException {
    Cipher aesCipher = Cipher.getInstance("AES");
    aesCipher.init(1, secKey);
    return aesCipher.doFinal(plainText.getBytes());
  }

  public static String decryptText(byte[] byteCipherText, SecretKey secKey)
      throws NoSuchAlgorithmException, NoSuchPaddingException, InvalidKeyException,
          IllegalBlockSizeException, BadPaddingException {
    Cipher aesCipher = Cipher.getInstance("AES");
    aesCipher.init(2, secKey);
    byte[] bytePlainText = aesCipher.doFinal(byteCipherText);
    return new String(bytePlainText);
  }

  public static String bytesToHex(byte[] bytes) {
    char[] hexChars = new char[bytes.length * 2];
    for (int j = 0; j < bytes.length; ++j) {
      int v = bytes[j] & 0xFF;
      hexChars[j * 2] = HEX_ARRAY[v >>> 4];
      hexChars[j * 2 + 1] = HEX_ARRAY[v & 0xF];
    }
    return new String(hexChars);
  }
}
