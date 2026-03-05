package dev.sim0n.app.test.impl.flow;

import dev.sim0n.app.test.Test;
import dev.sim0n.app.test.impl.flow.AES;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;

public class OpaqueConditionTest implements Test {
  private static final byte[] data = new byte[] {0, 1, 4, 3, 2};

  @Override
  public void run() {
    System.out.println("Testing opaque condition");
    int stage = 0;
    try {
      stage = 1;
      AES.main(new String[0]);
      stage = 2;
      if (data[0] == 0) {
        switch (data[1]) {
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
      } else {
        throw new IllegalArgumentException("Failed test! Stage: " + stage);
      }
      this.self(stage);
      throw new IllegalArgumentException("Failed test! Stage: " + stage);
    } catch (IllegalStateException e) {
      stage = 4;
    } catch (InvalidKeyException
        | NoSuchAlgorithmException
        | BadPaddingException
        | IllegalBlockSizeException
        | NoSuchPaddingException e) {
      e.printStackTrace();
      stage = -1;
    }
    if (data[2] != stage) {
      throw new IllegalArgumentException("Failed test! Stage: " + stage);
    }
  }

  private void self(int stage) {
    if (stage == 3) {
      throw new IllegalStateException("stage=" + stage);
    }
  }
}
