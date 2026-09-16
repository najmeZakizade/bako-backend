package com.bako.backend.config;

import com.bako.backend.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class GlobalControllerAdvice {

    @Autowired(required = false)
    private CartService cartService;

    @ModelAttribute("cartItemCount")
    public int getCartItemCount() {
        try {
            if (cartService == null) {
                return 0;
            }
            return cartService.getTotalItems();
        } catch (Exception e) {
            return 0;
        }
    }
}