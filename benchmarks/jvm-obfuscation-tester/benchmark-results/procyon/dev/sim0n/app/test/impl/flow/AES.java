package dev.sim0n.app.test.impl.flow;

import java.security.Key;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import java.security.InvalidKeyException;
import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import java.security.NoSuchAlgorithmException;
import javax.crypto.SecretKey;

public class AES {
  private static final char[] HEX_ARRAY;

  public static void main(final String[] args)
      throws NoSuchAlgorithmException, NoSuchPaddingException, IllegalBlockSizeException,
          BadPaddingException, InvalidKeyException {
    final String plainText = "Hello World";
    final SecretKey secKey = getSecretEncryptionKey();
    final byte[] cipherText = encryptText(plainText, secKey);
    final String decryptedText = decryptText(cipherText, secKey);
    System.out.println("Original Text: " + plainText);
    System.out.println("AES Key (Hex Form): " + bytesToHex(secKey.getEncoded()));
    System.out.println("Encrypted Text (Hex Form): " + bytesToHex(cipherText));
    System.out.println("Decrypted Text: " + decryptedText);
  }

  public static SecretKey getSecretEncryptionKey() throws NoSuchAlgorithmException {
    final KeyGenerator aesKeyGenerator = KeyGenerator.getInstance("AES");
    aesKeyGenerator.init(128);
    return aesKeyGenerator.generateKey();
  }

  public static byte[] encryptText(final String plainText, final SecretKey secKey)
      throws NoSuchAlgorithmException, NoSuchPaddingException, InvalidKeyException,
          IllegalBlockSizeException, BadPaddingException {
    final Cipher aesCipher = Cipher.getInstance("AES");
    aesCipher.init(1, secKey);
    return aesCipher.doFinal(plainText.getBytes());
  }

  public static String decryptText(final byte[] byteCipherText, final SecretKey secKey)
      throws NoSuchAlgorithmException, NoSuchPaddingException, InvalidKeyException,
          IllegalBlockSizeException, BadPaddingException {
    final Cipher aesCipher = Cipher.getInstance("AES");
    aesCipher.init(2, secKey);
    final byte[] bytePlainText = aesCipher.doFinal(byteCipherText);
    return new String(bytePlainText);
  }

  public static String bytesToHex(final byte[] bytes) {
    final char[] hexChars = new char[bytes.length * 2];
    for (int j = 0; j < bytes.length; ++j) {
      final int v = bytes[j] & 0xFF;
      hexChars[j * 2] = AES.HEX_ARRAY[v >>> 4];
      hexChars[j * 2 + 1] = AES.HEX_ARRAY[v & 0xF];
    }
    return new String(hexChars);
  }

  static {
    HEX_ARRAY = "0123456789ABCDEF".toCharArray();
  }
}
