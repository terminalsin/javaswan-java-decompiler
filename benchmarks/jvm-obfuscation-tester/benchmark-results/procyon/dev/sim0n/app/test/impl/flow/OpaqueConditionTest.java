package dev.sim0n.app.test.impl.flow;

import java.security.GeneralSecurityException;
import java.security.InvalidKeyException;
import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import java.security.NoSuchAlgorithmException;
import dev.sim0n.app.test.Test;

public class OpaqueConditionTest implements Test {
  private static final byte[] data;

  @Override
  public void run() {
    System.out.println("Testing opaque condition");
    int stage = 0;
    try {
      stage = 1;
      AES.main(new String[0]);
      stage = 2;
      if (OpaqueConditionTest.data[0] == 0) {
        switch (OpaqueConditionTest.data[1]) {
          case 0: {
            stage = -2;
            break;
          }
          case 1: {
            stage = 3;
            break;
          }
          default: {
            stage = -5;
            break;
          }
        }
        this.self(stage);
        throw new IllegalArgumentException("Failed test! Stage: " + stage);
      }
      throw new IllegalArgumentException("Failed test! Stage: " + stage);
    } catch (final IllegalStateException e) {
      stage = 4;
    } catch (final NoSuchAlgorithmException
        | NoSuchPaddingException
        | IllegalBlockSizeException
        | BadPaddingException
        | InvalidKeyException e2) {
      e2.printStackTrace();
      stage = -1;
    }
    if (OpaqueConditionTest.data[2] != stage) {
      throw new IllegalArgumentException("Failed test! Stage: " + stage);
    }
  }

  private void self(final int stage) {
    if (stage == 3) {
      throw new IllegalStateException("stage=" + stage);
    }
  }

  static {
    data = new byte[] {0, 1, 4, 3, 2};
  }
}
