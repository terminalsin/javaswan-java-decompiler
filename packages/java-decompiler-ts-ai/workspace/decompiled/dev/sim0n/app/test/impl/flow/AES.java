package dev.sim0n.app.test.impl.flow;

public class AES {
  private static final char[] HEX_ARRAY;
  
  public static void main(String[] args) throws java.security.NoSuchAlgorithmException, javax.crypto.NoSuchPaddingException, javax.crypto.IllegalBlockSizeException, javax.crypto.BadPaddingException, java.security.InvalidKeyException {
    String plainText = "Hello World";
    javax.crypto.SecretKey secKey = AES.getSecretEncryptionKey();
    byte[] cipherText = AES.encryptText(plainText, secKey);
    String decryptedText = AES.decryptText(cipherText, secKey);
    System.out.println(new StringBuilder().append("Original Text: ").append(plainText).toString());
    System.out.println(new StringBuilder().append("AES Key (Hex Form): ").append(AES.bytesToHex(secKey.getEncoded())).toString());
    System.out.println(new StringBuilder().append("Encrypted Text (Hex Form): ").append(AES.bytesToHex(cipherText)).toString());
    System.out.println(new StringBuilder().append("Decrypted Text: ").append(decryptedText).toString());
  }
  
  public static javax.crypto.SecretKey getSecretEncryptionKey() throws java.security.NoSuchAlgorithmException {
    javax.crypto.KeyGenerator aesKeyGenerator = javax.crypto.KeyGenerator.getInstance("AES");
    aesKeyGenerator.init(128);
    return aesKeyGenerator.generateKey();
  }
  
  public static byte[] encryptText(String plainText, javax.crypto.SecretKey secKey) throws java.security.NoSuchAlgorithmException, javax.crypto.NoSuchPaddingException, java.security.InvalidKeyException, javax.crypto.IllegalBlockSizeException, javax.crypto.BadPaddingException {
    javax.crypto.Cipher aesCipher = javax.crypto.Cipher.getInstance("AES");
    aesCipher.init(1, secKey);
    return aesCipher.doFinal(plainText.getBytes());
  }
  
  public static String decryptText(byte[] byteCipherText, javax.crypto.SecretKey secKey) throws java.security.NoSuchAlgorithmException, javax.crypto.NoSuchPaddingException, java.security.InvalidKeyException, javax.crypto.IllegalBlockSizeException, javax.crypto.BadPaddingException {
    javax.crypto.Cipher aesCipher = javax.crypto.Cipher.getInstance("AES");
    aesCipher.init(2, secKey);
    byte[] bytePlainText = aesCipher.doFinal(byteCipherText);
    return new String(bytePlainText);
  }
  
  public static String bytesToHex(byte[] bytes) {
    char[] hexChars = new char[bytes.length * 2];
    while (j < bytes.length) {
      int v = bytes[j] & 255;
      hexChars[j * 2] = HEX_ARRAY[v >>> 4];
      hexChars[j * 2 + 1] = HEX_ARRAY[v & 15];
      int j = j + 1;
    }
    return new String(hexChars);
  }
  
  static {
    HEX_ARRAY = "0123456789ABCDEF".toCharArray();
  }
}